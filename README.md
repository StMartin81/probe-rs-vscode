# The official VS Code extension for [probe-rs](https://probe.rs/) .

A VS Code extension for debugging embedded Rust applications using probe-rs, with support for a [large range of debug probes and chips](https://probe.rs/targets/?manufacturer=SHOW_ALL_MANUFACTURERS&family=SHOW_ALL_FAMILIES), including many variants of ARM Cortex-M, ARM Cortex-A, and RISC-V.

## Documentation

Full documentation on [Installation](https://probe.rs/docs/tools/debugger/#installation), [Configuration](https://probe.rs/docs/tools/debugger/#usage-and-configuration) and [supported functionality](https://probe.rs/docs/tools/debugger/#current-working-functionality-and-known-limitations)
can be found at [the probe-rs webpage](https://probe.rs/docs/tools/debugger/) and
under the [visual tour
heading](https://probe.rs/docs/tools/debugger/#a-visual-guide-of-implemented-features)

<img style="margin-top: 1em; margin-bottom: 1em; max-width:100%; max-height:100%; width: auto; height: auto;" src="https://probe.rs/images/probe-rs-debugger.gif" />

### Additional symbol files

For either `launch` or `attach`, add `symbolFiles` to a core configuration to
load symbols from extra ELF files, such as a separate bootloader:

```json
{
    "coreConfigs": [
        {
            "coreIndex": 0,
            "programBinary": "build/application.elf",
            "symbolFiles": ["build/bootloader.elf"]
        }
    ]
}
```

These files supplement `programBinary` for debugging and are never flashed.
Use absolute paths or paths relative to `cwd`. In `remoteServerMode`, the
extension reads and uploads the files from the machine running the extension.
Otherwise the DAP server reads them directly, including when a `server` URL
uses remote probes but the DAP server itself runs locally.

If the DAP server doesn't support `symbolFiles`, the session stops with an
error. Upgrade the server or remove `symbolFiles` to use it.

## Releasing

Maintainers cut releases via GitHub Releases; the publish workflow runs gated by required approval. See [PUBLISH.md](PUBLISH.md) for the release procedure and how the publishing pipeline is configured.
