import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {prepareClientFiles, ProbeRsDebugAdapter} from '../src/remoteServer';

const ignoreLog = () => {};

test('remote symbol files stay paired with paths in each core', async () => {
    const cwd = path.resolve('test');
    const relative = 'remoteServer.test.js';
    const absolute = path.join(cwd, 'vscode.js');
    const paths = [absolute, relative];
    const config = {
        cwd,
        remoteServerMode: true,
        coreConfigs: [
            {symbolFiles: paths, symbolFilesData: ['stale']},
            {coreIndex: 1, symbolFiles: [relative]},
            {coreIndex: 2, symbolFiles: []},
        ],
    };

    await prepareClientFiles(config, ignoreLog);

    const relativeBytes = await readFile(path.join(cwd, relative));
    const absoluteBytes = await readFile(absolute);
    assert.deepEqual(config.coreConfigs[0].symbolFiles, [absolute, relative]);
    assert.deepEqual(config.coreConfigs[0].symbolFilesData, [
        absoluteBytes.toString('base64'),
        relativeBytes.toString('base64'),
    ]);
    assert.deepEqual(config.coreConfigs[1].symbolFilesData, [relativeBytes.toString('base64')]);
    assert.equal(config.coreConfigs[2].symbolFilesData, undefined);
});

test('local symbol files are passed through as paths, without uploaded data', async () => {
    const core = {symbolFiles: ['not-read-by-the-extension.elf'], symbolFilesData: ['stale']};
    await prepareClientFiles({remoteServerMode: false, coreConfigs: [core]}, ignoreLog);
    assert.deepEqual(core, {symbolFiles: ['not-read-by-the-extension.elf']});
});

test('invalid path entries and missing remote files identify the configuration field', async () => {
    await assert.rejects(
        prepareClientFiles({coreConfigs: [{symbolFiles: ['good.elf', 2]}]}, ignoreLog),
        /coreConfigs\[0\]\.symbolFiles\[1\] must be a non-empty path string/,
    );
    await assert.rejects(
        prepareClientFiles(
            {
                remoteServerMode: true,
                cwd: path.resolve('test'),
                coreConfigs: [{symbolFiles: ['missing.elf']}],
            },
            ignoreLog,
        ),
        /coreConfigs\[0\]\.symbolFiles\[0\].*missing\.elf.*does not exist/,
    );
});

function frame(message) {
    const json = JSON.stringify(message);
    return Buffer.from(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
}

for (const command of ['launch', 'attach']) {
    test(`${command} forwards symbol files only when the server advertises support`, () => {
        for (const capabilities of [
            {},
            {supportsSymbolFiles: 'true'},
            {supportsSymbolFiles: true},
        ]) {
            const writes = [];
            const responses = [];
            let receive;
            const adapter = new ProbeRsDebugAdapter(
                {
                    start: ({onData}) => (receive = onData),
                    write: (data) => writes.push(data),
                    dispose() {},
                },
                {entries: []},
            );
            adapter.onDidSendMessage((message) => responses.push(message));
            const init = {type: 'request', command: 'initialize', seq: 1};
            adapter.handleMessage(init);
            assert.deepEqual(writes.shift(), frame(init));
            const initResponse = {
                type: 'response',
                command: 'initialize',
                seq: 1,
                request_seq: 1,
                success: true,
                body: capabilities,
            };
            receive(frame(initResponse));
            assert.deepEqual(responses.shift(), initResponse);

            const request = {
                type: 'request',
                command,
                seq: 2,
                arguments: {
                    coreConfigs: [{}, {symbolFiles: ['boot.elf'], symbolFilesData: ['YQ==']}],
                },
            };
            adapter.handleMessage(request);
            if (capabilities.supportsSymbolFiles === true) {
                assert.deepEqual(writes.shift(), frame(request));
                assert.deepEqual(responses, []);
            } else {
                assert.deepEqual(writes, []);
                const [error] = responses;
                assert.equal(error.type, 'response');
                assert.equal(error.command, command);
                assert.equal(error.request_seq, request.seq);
                assert.equal(error.success, false);
                assert.match(error.message, /symbolFiles.*Upgrade probe-rs/);

                for (const coreConfig of [{}, {symbolFiles: []}]) {
                    const legacyRequest = {
                        ...request,
                        arguments: {coreConfigs: [coreConfig]},
                    };
                    adapter.handleMessage(legacyRequest);
                    assert.deepEqual(writes.shift(), frame(legacyRequest));
                }
            }
            adapter.dispose();
        }
    });
}
