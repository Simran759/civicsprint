/** Canonical municipal departments — single source of truth for RBAC and AI output mapping */
const CANONICAL_DEPARTMENTS = [
  'Road Maintenance',
  'Water & Power',
  'Sanitation',
  'Code Enforcement',
  'Parks & Recreation',
];

const DEPARTMENT_ALIASES = {
  'public works': 'Road Maintenance',
  'public works dept': 'Road Maintenance',
  'public works department': 'Road Maintenance',
  roads: 'Road Maintenance',
  'road dept': 'Road Maintenance',
  'water & power dept': 'Water & Power',
  'water and power': 'Water & Power',
  utilities: 'Water & Power',
  'sanitation department': 'Sanitation',
  'sanitation dept': 'Sanitation',
  'waste management': 'Sanitation',
  'code enforcement dept': 'Code Enforcement',
  'parks & rec': 'Parks & Recreation',
  'parks and recreation': 'Parks & Recreation',
};

const CATEGORY_DEFAULT_DEPARTMENT = {
  Pothole: 'Road Maintenance',
  Streetlight: 'Water & Power',
  'Water Leak': 'Water & Power',
  Garbage: 'Sanitation',
  Graffiti: 'Code Enforcement',
  'General Repair': 'Road Maintenance',
};

/** Maps supervisor login department to DB values including legacy AI labels */
const SUPERVISOR_DEPARTMENT_QUERY = {
  'Road Maintenance': ['Road Maintenance', 'Public Works'],
  'Water & Power': ['Water & Power', 'Water & Power Dept'],
  Sanitation: ['Sanitation', 'Sanitation Department'],
  'Code Enforcement': ['Code Enforcement'],
  'Parks & Recreation': ['Parks & Recreation'],
};

function normalizeDepartment(rawDepartment, category = null) {
  if (!rawDepartment || typeof rawDepartment !== 'string') {
    return category ? (CATEGORY_DEFAULT_DEPARTMENT[category] || 'Road Maintenance') : 'Road Maintenance';
  }

  const trimmed = rawDepartment.trim();
  if (CANONICAL_DEPARTMENTS.includes(trimmed)) {
    return trimmed;
  }

  const alias = DEPARTMENT_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias;
  }

  const fuzzy = CANONICAL_DEPARTMENTS.find(
    (dept) => dept.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(dept.toLowerCase())
  );
  if (fuzzy) {
    return fuzzy;
  }

  return category ? (CATEGORY_DEFAULT_DEPARTMENT[category] || 'Road Maintenance') : 'Road Maintenance';
}

function getDepartmentQueryFilter(userDepartment) {
  if (!userDepartment) return null;
  const aliases = SUPERVISOR_DEPARTMENT_QUERY[userDepartment];
  if (aliases && aliases.length > 1) {
    return { $in: aliases };
  }
  return userDepartment;
}

module.exports = {
  CANONICAL_DEPARTMENTS,
  CATEGORY_DEFAULT_DEPARTMENT,
  normalizeDepartment,
  getDepartmentQueryFilter,
};
