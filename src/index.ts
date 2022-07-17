import moment from 'moment';
import { keys } from 'lodash';
import { WebSocketServer, WebSocket } from 'ws';

type Message = {
  type: 'alive' | 'message';
  from: string;
  target?: string;
  body?: string;
};

const chatServer: WebSocketServer = new WebSocketServer({ port: 8008 });

const registeredUsers: Record<string, { client: WebSocket; aliveAt: number }> =
  {};

const aliveUserList = (): string[] => {
  const now = moment().unix();
  return keys(registeredUsers).filter(
    (address) => now - registeredUsers[address].aliveAt < 60
  );
};

chatServer.on('connection', (ws) => {
  console.log('Connection received', ws.readyState);

  ws.on('message', (data) => {
    const message: Message = JSON.parse(data.toString());
    const now = moment().unix();
    switch (message.type) {
      case 'alive':
        console.log('Heartbeat from:', message.from);
        registeredUsers[message.from] = {
          client: ws,
          aliveAt: now
        };
        ws.send(
          JSON.stringify({
            at: now,
            users: aliveUserList()
          })
        );
        break;
      case 'message':
        console.log('Message from:', message.from, 'to:', message.target);
        if (message.target && message.body) {
          const target = aliveUserList().find(
            (address) => address === message.target
          );
          if (target) {
            const client = registeredUsers[target].client;
            client.send(
              JSON.stringify({
                at: now,
                from: message.from,
                message: message.body
              })
            );
          }
        }
        break;
      default:
        console.log('Unrecognized message', data);
    }
  });
});

console.log('Server started', chatServer.address());
