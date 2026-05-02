package repository

import (
	"database/sql"
	"time"

	"sentrynet/backend/internal/models"

	"github.com/google/uuid"
)

type userRepository struct{ db *sql.DB }

func newUserRepository(db *sql.DB) UserRepository { return &userRepository{db: db} }

func (r *userRepository) Create(user *models.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	now := time.Now()
	user.CreatedAt, user.UpdatedAt = now, now
	_, err := r.db.Exec(
		`INSERT INTO users (id, username, email, password_hash, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, user.ID, user.Username, user.Email, user.PasswordHash, user.Role, user.CreatedAt, user.UpdatedAt,
	)
	return err
}

func (r *userRepository) FindByEmail(email string) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`SELECT id, username, email, password_hash, role, created_at, updated_at
		FROM users WHERE email = $1
		`, email).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &u, err
}

func (r *userRepository) FindByID(ID uuid.UUID) (*models.User, error) {
	var u models.User
	err := r.db.QueryRow(
		`SELECT id, username, email, password_hash, role, created_at, updated_at
		FROM users WHERE id = $1
		`, ID).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return &u, err
}
