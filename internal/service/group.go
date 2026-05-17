package service

import (
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"sentrynet/backend/internal/models"
	"sentrynet/backend/internal/repository"
)

// GroupService handles business logic for groups, employees, and ticket workers.
type GroupService struct {
	groups        repository.GroupRepository
	employees     repository.EmployeeRepository
	ticketWorkers repository.TicketWorkerRepository
	tickets       repository.TicketRepository
}

func newGroupService(
	groups repository.GroupRepository,
	employees repository.EmployeeRepository,
	ticketWorkers repository.TicketWorkerRepository,
	tickets repository.TicketRepository,
) *GroupService {
	return &GroupService{groups: groups, employees: employees, ticketWorkers: ticketWorkers, tickets: tickets}
}

// ---- Groups ----

func (s *GroupService) ListGroups() ([]models.Group, error) {
	return s.groups.FindAll()
}

func (s *GroupService) GetGroup(id uuid.UUID) (*models.Group, error) {
	g, err := s.groups.FindByID(id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	return g, err
}

func (s *GroupService) CreateGroup(name, description string) (*models.Group, error) {
	g := &models.Group{Name: name, Description: description}
	if err := s.groups.Create(g); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *GroupService) UpdateGroup(id uuid.UUID, name, description string) (*models.Group, error) {
	g, err := s.GetGroup(id)
	if err != nil {
		return nil, err
	}
	g.Name = name
	g.Description = description
	if err := s.groups.Update(g); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *GroupService) DeleteGroup(id uuid.UUID) error {
	if _, err := s.GetGroup(id); err != nil {
		return err
	}
	return s.groups.Delete(id)
}

// ---- Employees ----

func (s *GroupService) ListEmployees(filter repository.EmployeeFilter) ([]models.Employee, error) {
	return s.employees.FindAll(filter)
}

func (s *GroupService) GetEmployee(id uuid.UUID) (*models.Employee, error) {
	emp, err := s.employees.FindByID(id)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	return emp, err
}

func (s *GroupService) CreateEmployee(groupID uuid.UUID, name, email, role string) (*models.Employee, error) {
	if _, err := s.GetGroup(groupID); err != nil {
		return nil, err
	}
	emp := &models.Employee{GroupID: groupID, Name: name, Email: email, Role: role}
	if err := s.employees.Create(emp); err != nil {
		return nil, err
	}
	return s.GetEmployee(emp.ID)
}

func (s *GroupService) UpdateEmployee(id uuid.UUID, groupID uuid.UUID, name, email, role string) (*models.Employee, error) {
	emp, err := s.GetEmployee(id)
	if err != nil {
		return nil, err
	}
	if _, err := s.GetGroup(groupID); err != nil {
		return nil, err
	}
	emp.GroupID = groupID
	emp.Name = name
	emp.Email = email
	emp.Role = role
	if err := s.employees.Update(emp); err != nil {
		return nil, err
	}
	return s.GetEmployee(id)
}

func (s *GroupService) DeleteEmployee(id uuid.UUID) error {
	if _, err := s.GetEmployee(id); err != nil {
		return err
	}
	return s.employees.Delete(id)
}

// ---- Ticket Workers ----

// AssignToTicket assigns an employee to a ticket, enforcing that the employee's
// group matches the ticket's assigned group. An unassigned ticket (empty
// AssignedGroup) accepts any employee.
func (s *GroupService) AssignToTicket(ticketID, employeeID uuid.UUID) error {
	ticket, err := s.tickets.FindByID(ticketID)
	if err != nil {
		return ErrNotFound
	}
	emp, err := s.GetEmployee(employeeID)
	if err != nil {
		return err
	}
	if ticket.AssignedGroup != "" {
		group, err := s.GetGroup(emp.GroupID)
		if err != nil {
			return err
		}
		if !strings.EqualFold(group.Name, ticket.AssignedGroup) {
			return fmt.Errorf("employee's group %q does not match ticket's assigned group %q", group.Name, ticket.AssignedGroup)
		}
	}
	return s.ticketWorkers.Assign(ticketID, employeeID)
}

func (s *GroupService) UnassignFromTicket(ticketID, employeeID uuid.UUID) error {
	return s.ticketWorkers.Unassign(ticketID, employeeID)
}

func (s *GroupService) GetTicketWorkers(ticketID uuid.UUID) ([]models.TicketWorker, error) {
	return s.ticketWorkers.FindByTicket(ticketID)
}
