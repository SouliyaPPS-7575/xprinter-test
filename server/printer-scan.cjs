// Simple mDNS (Bonjour) printer scanner using multicast-dns
// Scans for common printer service types and aggregates records.

const createMdns = require('multicast-dns');

const DEFAULT_TYPES = [
  '_ipp._tcp.local',
  '_ipps._tcp.local',
  '_printer._tcp.local',
  '_pdl-datastream._tcp.local',
  '_eSCL._tcp.local', // AirPrint scanning
  '_uscan._tcp.local',
];

function parseTxt(txtBuffers) {
  try {
    const buf = Buffer.concat(txtBuffers || []);
    // TXT is a series of <length><data> strings; multicast-dns already splits entries usually
    // Here we best-effort decode assuming array of buffers each containing key=value
    const entries = [];
    for (const b of txtBuffers || []) {
      const s = b.toString('utf8');
      if (!s) continue;
      const [k, v = ''] = s.split('=');
      if (k) entries.push([k, v]);
    }
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

// Aggregates resource records for service instances over a window of time.
function scanPrinters({ timeoutMs = 1500, types = DEFAULT_TYPES } = {}) {
  return new Promise((resolve) => {
    const mdns = createMdns();

    const instances = new Map(); // key: instance FQDN -> data
    const hostAddrs = new Map(); // key: host -> {ipv4:Set, ipv6:Set}

    function ensureInstance(name) {
      if (!instances.has(name)) {
        instances.set(name, {
          name,
          type: null,
          host: null,
          port: null,
          txt: {},
          addresses: new Set(),
          updatedAt: Date.now(),
        });
      }
      return instances.get(name);
    }

    function addAddr(host, addr, rrtype) {
      if (!host) return;
      if (!hostAddrs.has(host)) hostAddrs.set(host, { ipv4: new Set(), ipv6: new Set() });
      const rec = hostAddrs.get(host);
      if (rrtype === 'A') rec.ipv4.add(addr);
      else if (rrtype === 'AAAA') rec.ipv6.add(addr);
    }

    function applyHostAddrs(inst) {
      if (!inst.host) return;
      const rec = hostAddrs.get(inst.host);
      if (!rec) return;
      for (const a of rec.ipv4) inst.addresses.add(a);
      for (const a of rec.ipv6) inst.addresses.add(a);
    }

    mdns.on('response', (res) => {
      const all = [...(res.answers || []), ...(res.additionals || [])];
      for (const rr of all) {
        const { name, type, data } = rr || {};
        switch (type) {
          case 'PTR': {
            // name is the service type, data is the instance FQDN
            const inst = ensureInstance(data);
            inst.type = name;
            inst.updatedAt = Date.now();
            break;
          }
          case 'SRV': {
            // name is the instance FQDN, data has target + port
            const inst = ensureInstance(name);
            inst.host = data.target;
            inst.port = data.port;
            inst.updatedAt = Date.now();
            // If we already know host addrs, apply
            applyHostAddrs(inst);
            break;
          }
          case 'TXT': {
            const inst = ensureInstance(name);
            // multicast-dns gives TXT data as array of buffers
            inst.txt = { ...inst.txt, ...parseTxt(data) };
            inst.updatedAt = Date.now();
            break;
          }
          case 'A':
          case 'AAAA': {
            const host = name;
            addAddr(host, data, type);
            // update any instances pointing to this host
            for (const inst of instances.values()) {
              if (inst.host === host) applyHostAddrs(inst);
            }
            break;
          }
          default:
            break;
        }
      }
    });

    // Send queries for desired service types
    for (const t of types) {
      mdns.query({ questions: [{ name: t, type: 'PTR' }] });
    }

    const timer = setTimeout(() => {
      try { mdns.destroy(); } catch {}
      const out = Array.from(instances.values())
        .filter((i) => i.port || i.addresses.size > 0)
        .map((i) => ({
          name: i.name,
          type: i.type,
          host: i.host,
          port: i.port,
          txt: i.txt,
          addresses: Array.from(i.addresses),
        }));
      resolve(out);
    }, timeoutMs);

    // Safety: stop on process end
    const cleanup = () => {
      clearTimeout(timer);
      try { mdns.destroy(); } catch {}
    };
    process.once('exit', cleanup);
    process.once('SIGINT', () => { cleanup(); process.exit(); });
  });
}

module.exports = { scanPrinters, DEFAULT_TYPES };

