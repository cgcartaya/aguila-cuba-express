export const validPassword = (password: unknown): password is string =>
  typeof password === "string" &&
  password.length >= 12 &&
  password.length <= 128 &&
  /[A-Za-z]/.test(password) &&
  /\d/.test(password);
