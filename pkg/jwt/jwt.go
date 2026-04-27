// Package jwt provides JWT token generation and validation for the SentryNet API.
// Tokens are signed with HMAC-SHA256 and embed UserID, Username, and Role so
// the middleware can authorise requests without a database round-trip.
package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims are the custom payload embedded in every issued token.
type Claims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Role     string    `json:"role"`
	jwt.RegisteredClaims
}

// Manager signs and validates JWTs using a shared HMAC secret.
type Manager struct {
	secret []byte
	expiry time.Duration
}

func NewManager(secret string, expiry time.Duration) *Manager {
	return &Manager{
		secret: []byte(secret),
		expiry: expiry,
	}
}

// Generate creates and signs a new token for the given user identity.
func (m *Manager) Generate(userID uuid.UUID, username, role string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(m.secret)
}

// Validate parses and verifies the token string, returning the embedded claims.
// Returns an error if the token is expired, malformed, or uses the wrong algorithm.
func (m *Manager) Validate(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
