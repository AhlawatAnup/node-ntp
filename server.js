// basic-ntp-server.js
const dgram = require("dgram");
const server = dgram.createSocket("udp4");

const NTP_PORT = 124;
const NTP_UNIX_EPOCH_OFFSET = 2208988800; // NTP timestamp starts from 1900

function getNtpTime() {
  const now = Date.now(); // milliseconds since UNIX epoch (1970)
  const secondsSinceNTP = Math.floor(now / 1000) + NTP_UNIX_EPOCH_OFFSET;
  const fraction = Math.floor((now % 1000) * 4294967.296); // fractional part in NTP format
  return { seconds: secondsSinceNTP, fraction };
}

server.on("message", (msg, rinfo) => {
  const originateTimestampSeconds = msg.readUInt32BE(40);
  const originateTimestampFraction = msg.readUInt32BE(44);

  const { seconds, fraction } = getNtpTime();

  const buffer = Buffer.alloc(48);
  buffer[0] = 0x1c; // LI = 0 (no warning), VN = 3, Mode = 4 (server)

  // Stratum, Poll Interval, Precision
  buffer[1] = 1; // Stratum (1 = primary ref like GPS)
  buffer[2] = 6; // Poll Interval
  buffer[3] = 0xec; // Precision (~15ms)

  // Root Delay & Root Dispersion (set to zero)
  buffer.writeInt32BE(0, 4); // Root Delay
  buffer.writeInt32BE(0, 8); // Root Dispersion

  // Reference Identifier
  buffer.write("LOCL", 12); // Reference ID ("LOCL" = local clock)

  // Reference Timestamp
  buffer.writeUInt32BE(seconds, 16);
  buffer.writeUInt32BE(fraction, 20);

  // Originate Timestamp (copied from client)
  buffer.writeUInt32BE(originateTimestampSeconds, 24);
  buffer.writeUInt32BE(originateTimestampFraction, 28);

  // Receive Timestamp
  buffer.writeUInt32BE(seconds, 32);
  buffer.writeUInt32BE(fraction, 36);

  // Transmit Timestamp (same as receive, since we respond immediately)
  buffer.writeUInt32BE(seconds, 40);
  buffer.writeUInt32BE(fraction, 44);

  server.send(buffer, 0, buffer.length, rinfo.port, rinfo.address, (err) => {
    if (err) console.error("Failed to send NTP response:", err);
    else console.log(`Replied to ${rinfo.address}:${rinfo.port}`);
  });
});

server.on("listening", () => {
  const address = server.address();
  console.log(
    `Simple NTP server listening on ${address.address}:${address.port}`
  );
});

server.bind(NTP_PORT);
