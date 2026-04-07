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
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
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
	ingestH := handler.NewIngestHandler(services.Device, services.Metric)
	statusH := handler.NewStatusHandler(services.Device, services.Alarm)

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
	}

	// Protected routes — require JWT
	protected := api.Group("")
	protected.Use(middleware.JWT(jwtMgr))
	{
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

		// Tickets — admin only
		tickets := protected.Group("/tickets")
		tickets.Use(middleware.RequireRole("admin"))
		{
			tickets.GET("", alarmH.ListTickets)
			tickets.GET("/:id", alarmH.GetTicket)
		}
	}

	return r
}
