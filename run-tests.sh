#!/bin/bash

# SQL Query Agent - Comprehensive Test Runner
# Provides industry-standard test output formatting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;92m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Print formatted header
print_header() {
    echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Print test layer header
print_layer() {
    echo -e "\n${BOLD}${BLUE}▶ $1${NC}\n"
}

# Print success message
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Print error message
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Print warning message
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Main test runner
main() {
    print_header "SQL Query Agent - Test Suite"
    
    local all_passed=true
    local test_type="${1:-all}"  # Default to all tests
    
    # Start time
    start_time=$(date +%s)
    
    # Run Backend Tests
    if [[ "$test_type" == "all" || "$test_type" == "backend" ]]; then
        print_layer "Backend Tests (FastAPI + SQLAlchemy)"
        
        if cd /workspaces/SQL_QUERY_AGENT/backend && python -m pytest -v --tb=short --color=yes; then
            print_success "Backend tests passed"
        else
            print_error "Backend tests failed"
            all_passed=false
        fi
        cd /workspaces/SQL_QUERY_AGENT
    fi
    
    # Run Frontend Tests
    if [[ "$test_type" == "all" || "$test_type" == "frontend" ]]; then
        print_layer "Frontend Tests (React + Vitest)"
        
        if cd /workspaces/SQL_QUERY_AGENT/frontend && npm test -- --run --reporter=verbose; then
            print_success "Frontend tests passed"
        else
            print_error "Frontend tests failed"
            all_passed=false
        fi
        cd /workspaces/SQL_QUERY_AGENT
    fi
    
    # Run E2E Tests (if requested)
    if [[ "$test_type" == "e2e" ]]; then
        print_layer "E2E Tests (Playwright)"
        
        if npx playwright test --reporter=list; then
            print_success "E2E tests passed"
        else
            print_warning "E2E tests require: npx playwright install"
        fi
    fi
    
    # Calculate elapsed time
    end_time=$(date +%s)
    elapsed=$((end_time - start_time))
    minutes=$((elapsed / 60))
    seconds=$((elapsed % 60))
    
    # Print final summary
    print_header "Test Summary"
    
    if [ "$all_passed" = true ]; then
        echo -e "${GREEN}${BOLD}✓ All tests passed!${NC}"
    else
        echo -e "${RED}${BOLD}✗ Some tests failed. Please review above.${NC}"
        exit 1
    fi
    
    echo -e "\nℹ Total time: ${minutes}m ${seconds}s"
    echo -e "\n${CYAN}Run specific tests:${NC}"
    echo -e "  ${BOLD}./run-tests.sh backend${NC}   - Backend tests only"
    echo -e "  ${BOLD}./run-tests.sh frontend${NC}  - Frontend tests only"
    echo -e "  ${BOLD}./run-tests.sh e2e${NC}       - E2E tests only"
    echo -e "  ${BOLD}./run-tests.sh all${NC}       - All tests (default)"
    echo ""
}

# Run main function
main "$@"
