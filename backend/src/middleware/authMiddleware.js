/**
 * Auth Middleware for CivicSprint AI RBAC & Privacy
 */
exports.extractUser = (req, res, next) => {
  const role = req.headers['x-user-role'] || 'citizen';
  const email = req.headers['x-user-email'] || '';
  const department = req.headers['x-user-department'] || '';
  const name = req.headers['x-user-name'] || 'Anonymous';

  req.user = {
    role,
    email,
    department,
    name,
  };

  next();
};

exports.requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'citizen';

    // Super Admin bypasses everything
    if (userRole === 'admin' || userRole === 'super_admin') {
      return next();
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access Denied. Required roles: [${allowedRoles.join(', ')}]. Current role: ${userRole}.`,
    });
  };
};
