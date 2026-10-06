// Shared by the reset and change-password screens. The server must apply the same rule.
export function passwordProblem(password) {
  if (password.length < 10) return 'Use at least 10 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number';
  return '';
}