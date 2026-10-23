const nonempty = value => typeof value === 'string' && value.length > 0;
const deny = reason => ({ decision: 'DENY', reason });

/** Actor must come from a trusted authentication snapshot, never client claims. */
export function checkAccess(actor, { tenantId, capability, assignedSalesId } = {}) {
  if (!nonempty(actor?.actorId) || !nonempty(tenantId) || actor?.tenantId !== tenantId
    || !nonempty(capability) || !Array.isArray(actor.permissions) || !actor.permissions.includes(capability)
    || (assignedSalesId !== undefined && actor.actorId !== assignedSalesId)) return deny('FORBIDDEN');
  return { decision: 'CONTINUE', reason: 'ACCESS_OK' };
}

/** Necessary conditions only; no authorization, phone or storage side effects. */
export function checkEligibility({ actor, task, contact } = {}) {
  if (!task || !contact || !nonempty(task.assignedSalesId)
    || contact.tenantId !== task.tenantId
    || checkAccess(actor, { tenantId: task.tenantId, capability: 'trigger', assignedSalesId: task.assignedSalesId }).decision !== 'CONTINUE') return deny('FORBIDDEN');
  if (!nonempty(task.targetKey) || task.targetKey !== contact.targetKey) return deny('TARGET_MISMATCH');
  if (contact.doNotContact === true) return deny('DO_NOT_CONTACT');
  if (contact.doNotContact !== false) return deny('REFUSAL_STATE_UNKNOWN');
  if (contact.qualification !== 'CONFIRMED') return deny('QUALIFICATION_NOT_CONFIRMED');
  return { decision: 'CONTINUE', reason: 'ELIGIBILITY_OK' };
}
