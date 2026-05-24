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

func (r *userRepository) List() ([]*models.User, error) {
    rows, err := r.db.Query(
        `SELECT id, username, email, password_hash, role, created_at, updated_at
         FROM users ORDER BY created_at ASC`,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []*models.User
    for rows.Next() {
        var u models.User
        if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.Role, &u.CreatedAt, &u.UpdatedAt); err != nil {
            return nil, err
        }
        users = append(users, &u)
    }
    return users, rows.Err()
}

func (r *userRepository) Update(user *models.User) error {
    user.UpdatedAt = time.Now()
    _, err := r.db.Exec(
        `UPDATE users SET username=$1, email=$2, password_hash=$3, role=$4, updated_at=$5
         WHERE id=$6`,
        user.Username, user.Email, user.PasswordHash, user.Role, user.UpdatedAt, user.ID,
    )
    return err
}
