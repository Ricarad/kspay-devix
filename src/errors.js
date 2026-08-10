class DevixError extends Error {
  constructor(code, message, details = undefined, exitCode = 1) {
    super(message);
    this.name = "DevixError";
    this.code = code;
    this.details = details;
    this.exitCode = exitCode;
  }
}

class WorkspaceConflictError extends DevixError {
  constructor(message, details) {
    super("WORKSPACE_CONFLICT", message, details, 2);
  }
}

module.exports = { DevixError, WorkspaceConflictError };
