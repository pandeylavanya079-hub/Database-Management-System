import AuditLog from '../models/AuditLog';

export const logAudit = async (
  userEmail: string,
  action: string,
  oldValue: any,
  newValue: any
): Promise<void> => {
  try {
    // Stringify if they are objects, to ensure they look clean in logs if needed, or save directly as mixed
    await AuditLog.create({
      user: userEmail,
      action,
      oldValue,
      newValue,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error(`[AUDIT LOG ERROR] Failed to create audit log: ${error.message}`);
  }
};
export default logAudit;
