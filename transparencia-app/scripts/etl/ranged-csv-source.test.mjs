import http from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { readRangedTextLines } from "./ranged-csv-source.mjs";

const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

describe("readRangedTextLines", () => {
  it("reintenta un bloque interrumpido sin duplicar ni perder lineas", async () => {
    const payload = Buffer.from([
      "nombre;organismo\r\n",
      "Ana;Municipalidad de Maipu\r\n",
      "Beto;Municipalidad de Arica\r\n",
      "Carla;Municipalidad de Castro\r\n",
    ].join(""), "latin1");
    let interrupted = false;
    const ranges = [];
    const server = http.createServer((request, response) => {
      if (request.method === "HEAD") {
        response.writeHead(200, {
          "accept-ranges": "bytes",
          "content-length": payload.length,
          etag: '"fixture-v1"',
        });
        response.end();
        return;
      }

      const match = /^bytes=(\d+)-(\d+)$/.exec(String(request.headers.range));
      if (!match) {
        response.writeHead(400).end();
        return;
      }
      const start = Number(match[1]);
      const end = Math.min(Number(match[2]), payload.length - 1);
      ranges.push(`${start}-${end}`);
      response.writeHead(206, {
        "content-range": `bytes ${start}-${end}/${payload.length}`,
        "content-length": end - start + 1,
        etag: '"fixture-v1"',
      });

      const chunk = payload.subarray(start, end + 1);
      if (!interrupted && start === 16) {
        interrupted = true;
        response.write(chunk.subarray(0, 3));
        response.socket.destroy();
        return;
      }
      response.end(chunk);
    });
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/personal.csv`;

    const lines = [];
    for await (const line of readRangedTextLines({
      urls: [url],
      chunkSize: 16,
      retryDelaysMs: [0, 0],
    })) {
      lines.push(line);
    }

    expect(lines).toEqual([
      "nombre;organismo",
      "Ana;Municipalidad de Maipu",
      "Beto;Municipalidad de Arica",
      "Carla;Municipalidad de Castro",
    ]);
    expect(ranges.filter((range) => range === "16-31")).toHaveLength(2);
  });
});
