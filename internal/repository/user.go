package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"sentrynet/backend/internal/models"
)

type userRepository struct {
	db *gorm.DB
}

func newUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

// Create inserts a new user record. Fails if the username or email is already taken.
func (r *userRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

// FindByEmail looks up a user by their (lowercased) email address.
// Returns gorm.ErrRecordNotFound if no match exists.
func (r *userRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByID looks up a user by their UUID primary key.
func (r *userRepository) FindByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	if err := r.db.First(&user, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
