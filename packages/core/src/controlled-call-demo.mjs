import {controlledCallFixture} from '../test-support/controlled-call-fixture.mjs';
import {ControlledCallPort} from '../test-support/controlled-call-port.mjs';
const port=new ControlledCallPort({outcome:'LOST_RECEIPT'}),valid=controlledCallFixture(),invalid=controlledCallFixture();invalid.permit.revoked=true;
console.log(JSON.stringify({mode:'contract-test-only',revoked:port.submit(invalid),lostReceipt:port.submit(valid),recordedRequests:port.requests.length,actualPhoneApiCalls:0},null,2));
