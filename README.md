# Leave Management System

A comprehensive web-based leave management application built with HTML, CSS, and JavaScript. This system provides complete functionality for managing employee leave requests, approvals, and scheduling.

## Features

### 1. **Dashboard**
- Real-time statistics display
- Total employees count
- Current employees on leave
- Pending leave requests
- Approved leaves overview
- Live updates as data changes

### 2. **Employee Management**
- Add new employees with details (name, email, department)
- View all employees with leave balances
- Edit employee information
- Delete employees from the system
- Track leave balance for each employee

### 3. **Leave Application**
- Submit leave requests with:
  - Employee selection
  - Leave type (Annual, Sick, Personal, Maternity)
  - Start and end dates
  - Reason for leave
- Automatic leave balance validation
- Date validation (end date must be after start date)
- Leave days calculation

### 4. **Leave Approval**
- View all pending leave requests
- Approve or reject leave requests
- Automatic leave balance deduction upon approval
- Status tracking (Pending, Approved, Rejected)

### 5. **Leave Schedule**
- Visual calendar of approved leaves
- See which employees are on leave on specific dates
- Date-wise employee absence tracking

### 6. **Data Persistence**
- Uses browser localStorage for data persistence
- All changes are automatically saved
- Data persists across sessions
- Default sample data on first load

### 7. **Notifications**
- Real-time success/error/info notifications
- Toast-style notifications
- Auto-dismiss after 3 seconds
- Type-specific styling (green for success, red for error, blue for info)

## Technical Stack

### Frontend
- **HTML5** - Semantic structure
- **CSS3** - Modern styling with:
  - CSS Variables for theming
  - Responsive design
  - Gradient backgrounds
  - CSS Grid and Flexbox layouts
  - Smooth transitions and animations
- **Vanilla JavaScript** - No dependencies
  - Object-oriented design with classes
  - Event-driven architecture
  - localStorage API for persistence

### Design System

#### Color Palette
- **Primary**: #406bc4 (Professional blue)
- **Accent**: #2cb2ff (Bright blue)
- **Success**: #2ece96 (Green)
- **Danger**: #f45e6d (Red)
- **Background**: Gradient with subtle radial effects

#### Typography
- **Font Family**: Inter, system-ui, Segoe UI
- **Weights**: 400, 500, 600, 700, 800

#### Components
- Glassmorphic cards with shadows
- Rounded buttons with gradients
- Status badges with color coding
- Smooth hover effects and transitions

## File Structure

```
Leave-management/
├── index.html              # Landing/login page
├── dashboard.html          # Dashboard with statistics
├── employee.html           # Employee management
├── application.html        # Leave application form
├── approval.html           # Leave approval interface
├── schedule.html           # Leave schedule view
├── styles.css              # Global styles & design system
├── script.js               # Core application logic
└── README.md              # This file
```

## How to Use

### 1. Starting the Application
1. Open any `.html` file in a web browser
2. Navigate using the top navigation menu
3. Default employees are pre-loaded on first use

### 2. Adding an Employee
1. Go to "Employee Management"
2. Click "Add Employee"
3. Fill in Name, Email, and Department
4. Click "Add Employee"
5. Notification confirms success

### 3. Submitting Leave
1. Go to "Leave Application"
2. Select employee from dropdown
3. Choose leave type
4. Set start and end dates
5. Provide reason
6. Click "Submit Leave Request"
7. System validates leave balance automatically

### 4. Approving Leave
1. Go to "Leave Approval"
2. Review pending requests
3. Click "Approve" or "Reject"
4. Leave balance updates automatically upon approval

### 5. Viewing Schedule
1. Go to "Leave Schedule"
2. See all approved leaves organized by date
3. View which employees are absent on each day

## Class Structure: LeaveManagementSystem

### Constructor
```javascript
constructor()
```
Initializes the system with localStorage data or default employees.

### Methods

#### Employee Management
- `addEmployee(name, email, department, leaveBalance)` - Add new employee
- `updateEmployee(id, updates)` - Update employee details
- `deleteEmployee(id)` - Remove employee
- `getEmployee(id)` - Retrieve employee by ID

#### Leave Management
- `submitLeaveRequest(employeeId, startDate, endDate, reason, leaveType)` - Create leave request
- `approveLeave(requestId)` - Approve and deduct leave balance
- `rejectLeave(requestId, reason)` - Reject leave request
- `getPendingRequests()` - Get all pending leaves
- `getEmployeeLeaveHistory(employeeId)` - Get employee's leave history

#### Data & UI
- `getDashboardStats()` - Calculate statistics
- `renderEmployeeTable(containerId)` - Render employee list
- `renderLeaveRequests(containerId, status)` - Render leave request table
- `renderLeaveSchedule(containerId)` - Render calendar of leaves
- `showNotification(message, type)` - Display toast notification
- `saveData()` - Persist data to localStorage

## Validation & Business Logic

### Leave Request Validation
✓ Date validation (end date > start date)
✓ Leave balance check
✓ Required fields validation
✓ Employee existence verification

### Data Persistence
✓ Automatic saving to localStorage
✓ JSON serialization/deserialization
✓ Session survival across browser refresh

### State Management
✓ Centralized data store
✓ Consistent state updates
✓ Automatic UI refresh on data changes

## User Experience Enhancements

### Notifications System
- Success (Green) - Confirmation of actions
- Error (Red) - Validation failures or insufficient leave
- Info (Blue) - Status updates

### Responsive Design
- Mobile-first approach
- Breakpoint at 860px for tablets/desktops
- Touch-friendly button sizes
- Flexible layouts

### Accessibility
- Semantic HTML structure
- Proper form labels
- Keyboard navigable
- Clear visual hierarchy

## Sample Data

The system comes with 4 default employees:
1. **John Doe** - Engineering, 20 days leave
2. **Jane Smith** - HR, 18 days leave
3. **Alice Johnson** - Sales, 15 days leave
4. **Bob Wilson** - Engineering, 22 days leave

## Data Storage

All data is stored in browser localStorage:
- `employees` - Array of employee objects
- `leaveRequests` - Array of leave request objects

### Employee Object
```javascript
{
  id: number,
  name: string,
  email: string,
  department: string,
  leaveBalance: number
}
```

### Leave Request Object
```javascript
{
  id: number,
  employeeId: number,
  employeeName: string,
  startDate: string,
  endDate: string,
  reason: string,
  leaveType: string,
  days: number,
  status: 'pending' | 'approved' | 'rejected',
  submittedAt: string
}
```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript enabled and localStorage support.

## Future Enhancements

Potential features for version 2.0:
- Backend API integration
- User authentication
- Email notifications
- Leave type customization
- Department-wise reports
- Export functionality (PDF/CSV)
- Dark mode
- Multi-language support
- Advanced analytics
- File upload for documents

## Performance Considerations

- No external dependencies (lightweight)
- Client-side processing only
- Instant feedback with notifications
- Optimized DOM updates
- Efficient localStorage usage

## Security Notes

This is a frontend-only application. For production use:
- Implement backend authentication
- Add server-side validation
- Encrypt sensitive data
- Use HTTPS
- Implement proper access control
- Add audit logging

## Author Notes

This leave management system demonstrates:
- Object-oriented JavaScript design
- DOM manipulation and event handling
- Data persistence with localStorage
- Form validation and error handling
- Responsive UI design
- User experience best practices
- Clean code organization
- Professional styling

---

**Version**: 1.0  
**Last Updated**: May 2026  
**Status**: Production Ready
