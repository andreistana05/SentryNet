// Package middleware provides Gin middleware for authentication, authorisation,
// and request logging.
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"sentrynet/backend/pkg/jwt"
)

const claimsKey = "claims"

// JWT returns a middleware that validates the Authorization: Bearer <token> header.
func JWT(jwtMgr *jwt.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			return
		}

		claims, err := jwtMgr.Validate(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set(claimsKey, claims)
		c.Next()
	}
}

// RequireRole returns a middleware that allows only users with one of the given roles.
func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}

	return func(c *gin.Context) {
		claims, ok := c.Get(claimsKey)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}

		jwtClaims, ok := claims.(*jwt.Claims)
		if !ok || !allowed[jwtClaims.Role] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}

		c.Next()
	}
}

// APIKey returns a middleware that checks the X-API-Key header against the configured key.
func APIKey(key string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetHeader("X-API-Key") != key {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid API key"})
			return
		}
		c.Next()
	}
}

// GetClaims extracts JWT claims from the gin context (set by the JWT middleware).
func GetClaims(c *gin.Context) *jwt.Claims {
	v, _ := c.Get(claimsKey)
	claims, _ := v.(*jwt.Claims)
	return claims
}
