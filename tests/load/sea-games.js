import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'https://localhost';
const eventId = __ENV.EVENT_ID || '';

export const options = {
  scenarios: {
    public_schedule: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const requests = [
    ['events', `${baseUrl}/api/events?limit=20`],
    ['sports', `${baseUrl}/api/sports`],
  ];
  if (eventId) {
    requests.push(
      ['summary', `${baseUrl}/api/matches/event/${eventId}/schedule-summary`],
      ['schedule', `${baseUrl}/api/matches?eventId=${eventId}&pagination=cursor&limit=50`],
    );
  }
  const responses = http.batch(requests.map(([name, url]) => ({ method: 'GET', url, tags: { name } })));
  responses.forEach((response) => {
    check(response, { 'status is 200': (result) => result.status === 200 });
  });
  sleep(Math.random() * 2 + 0.5);
}
