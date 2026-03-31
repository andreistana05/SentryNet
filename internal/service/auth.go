package service

import (
	"errors"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
	"sentrynet/backend/pkg/jwt"
)

type AuthService struct {
	users  repository.UserRepository
	jwtMgr *jwt.Manager
}

func newAuthService(users repository.UserRepository, jwtMgr *jwt.Manager) *AuthService {
	return &AuthService{users: users, jwtMgr: jwtMgr}
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

func (s *AuthService) Register(req RegisterRequest) (*AuthResponse, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	role := models.RoleViewer
	if req.Role != "" {
		role = models.UserRole(strings.ToLower(req.Role))
	}

	user := &models.User{
		Username:     req.Username,
		Email:        strings.ToLower(req.Email),
		PasswordHash: string(hash),
		Role:         role,
	}

	if err := s.users.Create(user); err != nil {
		return nil, err
	}

	token, err := s.jwtMgr.Generate(user.ID, user.Username, string(user.Role))
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}

func (s *AuthService) Login(req LoginRequest) (*AuthResponse, error) {
	user, err := s.users.FindByEmail(strings.ToLower(req.Email))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	token, err := s.jwtMgr.Generate(user.ID, user.Username, string(user.Role))
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: user}, nil
}
