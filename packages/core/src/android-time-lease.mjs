export function leaseProof({lease:l,digest,remainingAtRequest,roundTripMs}){
 if(!l||l.schemaVersion!==1||l.status!=='READY'||l.commandDigest!==digest||!/^([a-f0-9]{32})$/.test(l.nonce)
  ||![l.issuedElapsed,l.expiresElapsed,l.bootCount,remainingAtRequest].every(Number.isSafeInteger)
  ||l.issuedElapsed<0||l.bootCount<0||l.expiresElapsed<=l.issuedElapsed||l.expiresElapsed-l.issuedElapsed>60000
  ||remainingAtRequest<1||remainingAtRequest>60000||!Number.isFinite(roundTripMs)||roundTripMs<0||roundTripMs>=remainingAtRequest)throw Error('INVALID_OR_EXPIRED_TIME_LEASE');
 const validUntilElapsed=Math.min(l.expiresElapsed,l.issuedElapsed+remainingAtRequest-Math.ceil(roundTripMs));
 return {nonce:l.nonce,validUntilElapsed};
}
