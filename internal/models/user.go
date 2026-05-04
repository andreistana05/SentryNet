// user.go defines the User model and the UserRole enumeration (admin, operator,
// viewer). Users are dashboard accounts only — agents authenticate with an API
// key, not a user record.
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserRole determines which API operations a dashboard user may perform.
// admin can manage devices and users; operator can update alarms and tickets;
// viewer has read-only access.
type UserRole string

const (
	RoleAdmin    UserRole = "admin"
	RoleOperator UserRole = "operator"
	RoleViewer   UserRole = "viewer"
)

// User represents a SentryNet dashboard account.
// PasswordHash is tagged json:"-" so it is never serialised into API responses.
type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Username     string    `gorm:"uniqueIndex;not null;size:100" json:"username"`
	Email        string    `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	Role         UserRole  `gorm:"type:varchar(20);not null;default:'viewer'" json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
