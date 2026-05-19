// Package router wires together handlers, middleware, and URL paths for the
// SentryNet API (all routes are prefixed /api/v1).
// Ingest routes use API key auth (consumed by agents and the network monitor).
// All dashboard and management routes require a JWT Bearer token.
package router

import (
	"github.com/gin-gonic/gin"

	"sentrynet/backend/internal/config"
	"sentrynet/backend/internal/handler"
	"sentrynet/backend/internal/middleware"
	"sentrynet/backend/internal/service"
	"sentrynet/backend/pkg/jwt"
)

func New(services *service.Services, cfg *config.Config) *gin.Engine {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())

	// CORS — allow requests from the Dashboard (Module 3)
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-API-Key")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	jwtMgr := jwt.NewManager(cfg.JWTSecret, cfg.JWTExpiry)

	// Handlers
	authH := handler.NewAuthHandler(services.Auth)
	deviceH := handler.NewDeviceHandler(services.Device, services.Metric)
	alarmH := handler.NewAlarmHandler(services.Alarm)
	ingestH := handler.NewIngestHandler(services.Device, services.Metric, services.Alarm)
	statusH := handler.NewStatusHandler(services.Device, services.Alarm)
	groupH := handler.NewGroupHandler(services.Group)

	api := r.Group("/api/v1")

	// Public auth routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", authH.Register)
		auth.POST("/login", authH.Login)
	}

	// Ingest routes — authenticated by API key (used by Module 1 & Module 4)
	ingest := api.Group("/ingest")
	ingest.Use(middleware.APIKey(cfg.IngestAPIKey))
	{
		ingest.GET("/devices", ingestH.Devices)
		ingest.POST("/metrics", ingestH.Metrics)
		ingest.POST("/heartbeat", ingestH.Heartbeat)
		ingest.POST("/event", ingestH.Event)
	}

	// Protected routes — require JWT
	protected := api.Group("")
	protected.Use(middleware.JWT(jwtMgr))
	{
		// Profile & user management
		protected.POST("/auth/me/verify-password", authH.VerifyPassword)
		protected.PUT("/auth/me", authH.UpdateMe)
		protected.GET("/users", authH.ListUsers)
		protected.PATCH("/users/:id/role", middleware.RequireRole("admin"), authH.UpdateUserRole)

		protected.GET("/status", statusH.Overview)

		// Devices
		devices := protected.Group("/devices")
		{
			devices.GET("", deviceH.List)
			devices.GET("/new", deviceH.ListNew)
			devices.POST("", deviceH.Create)
			devices.GET("/:id", deviceH.Get)
			devices.PUT("/:id", deviceH.Update)
			devices.DELETE("/:id", deviceH.Delete)
			devices.GET("/:id/metrics", deviceH.GetMetrics)
		}

		// Alarms
		alarms := protected.Group("/alarms")
		{
			alarms.GET("", alarmH.ListAlarms)
			alarms.GET("/:id", alarmH.GetAlarm)
			alarms.PUT("/:id/in-progress", alarmH.SetInProgress)
			alarms.PUT("/:id/close", alarmH.CloseAlarm)
		}

		// Incidents
		incidents := protected.Group("/incidents")
		{
			incidents.GET("", alarmH.ListIncidents)
			incidents.GET("/:id", alarmH.GetIncident)
			incidents.PUT("/:id/close", alarmH.CloseIncident)
		}

		// Problems
		problems := protected.Group("/problems")
		{
			problems.GET("", alarmH.ListProblems)
			problems.GET("/:id", alarmH.GetProblem)
			problems.PUT("/:id/close", alarmH.CloseProblem)
		}

		// Tickets
		tickets := protected.Group("/tickets")
		{
			tickets.GET("", alarmH.ListTickets)
			tickets.GET("/:id", alarmH.GetTicket)
			tickets.PATCH("/:id/status", alarmH.UpdateTicketStatus)
			tickets.GET("/:id/notes", alarmH.GetTicketNotes)
			tickets.POST("/:id/notes", alarmH.CreateTicketNote)
			tickets.GET("/:id/workers", groupH.GetTicketWorkers)
			tickets.POST("/:id/workers", groupH.AssignTicketWorker)
			tickets.DELETE("/:id/workers/:employeeId", groupH.UnassignTicketWorker)
		}

		// Groups
		groups := protected.Group("/groups")
		{
			groups.GET("", groupH.ListGroups)
			groups.POST("", groupH.CreateGroup)
			groups.GET("/:id", groupH.GetGroup)
			groups.PUT("/:id", groupH.UpdateGroup)
			groups.DELETE("/:id", groupH.DeleteGroup)
		}

		// Employees
		employees := protected.Group("/employees")
		{
			employees.GET("", groupH.ListEmployees)
			employees.POST("", groupH.CreateEmployee)
			employees.GET("/:id", groupH.GetEmployee)
			employees.PUT("/:id", groupH.UpdateEmployee)
			employees.DELETE("/:id", groupH.DeleteEmployee)
		}
	}

	return r
}
