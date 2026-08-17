import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

// TwiML answered when Twilio connects the outbound emergency-escalation
// call (AlertsService.notifyTier's VOICE channel) to a technician/owner who
// didn't ack push/SMS in time.
@Controller('twiml')
export class TwimlController {
  @Get('emergency-alert')
  emergencyAlert(@Res() res: Response) {
    res
      .type('text/xml')
      .send(
        `<Response><Say>This is an urgent alert from your AI receptionist. A caller reported an emergency and has not been acknowledged. Please open your dashboard immediately.</Say><Pause length="1"/><Say>Repeating: please open your dashboard immediately.</Say></Response>`,
      );
  }
}
