/**
 * (c) 2016-2017 eystone.JS
 * Wrapper made by Alexandro Sanchez Bach.
 */

// Emscripten demodularize

var MKeystone = await new MKeystone();

var ks = {
    version: function() {
        major_ptr = MKeystone._malloc(4);
        minor_ptr = MKeystone._malloc(4);
        var ret = MKeystone.ccall('ks_version', 'number',
            ['pointer', 'pointer'], [major_ptr, minor_ptr]);
        major = MKeystone.getValue(major_ptr, 'i32');
        minor = MKeystone.getValue(minor_ptr, 'i32');
        MKeystone._free(major_ptr);
        MKeystone._free(minor_ptr);
        return ret;
    },

    arch_supported: function(arch) {
        var ret = MKeystone._ks_arch_supported(arch);
        return ret;
    },

    strerror: function(code) {
        var ret = MKeystone._ks_strerror(code);
        return ret;
    },

    /**
     * Keystone object
     */
    Keystone: function (arch, mode) {
        this.arch = arch;
        this.mode = mode;
        this.handle_ptr = MKeystone._malloc(4);

        // Options
        this.option = function(option, value) {
            var handle = MKeystone.getValue(this.handle_ptr, '*');
            if (!handle) {
                return;
            }
            var ret = MKeystone.ccall('ks_option', 'number',
                ['pointer', 'number', 'number'],
                [handle, option, value]
            );
            if (ret != ks.ERR_OK) {
                var error = 'Keystone.js: Function ks_option failed with code ' + ret + ':\n' + MKeystone._ks_strerror(ret);
                throw error;
            }
        }

        // Assembler
        this.asm = function (assembly, address) {
            var handle = MKeystone.getValue(this.handle_ptr, '*');
            if (!handle) {
                return [];
            }

            var insn_ptr = MKeystone._malloc(4);
            var size_ptr = MKeystone._malloc(4);
            var count_ptr = MKeystone._malloc(4);

            // Allocate buffer and copy data
            var buffer_len = assembly.length + 1;
            var buffer_ptr = MKeystone._malloc(buffer_len);
            MKeystone.stringToUTF8(assembly, buffer_ptr, buffer_len);

            // Run the assembler. Note that the third argument is split
            // in the two integers that make the uint64_t address value.
            // Due to JavaScript limitations only the lower 32-bit can be modified.
            var ret = MKeystone.ccall('ks_asm', 'number',
                ['pointer', 'pointer', 'number', 'number', 'pointer', 'pointer', 'pointer'],
                [handle, buffer_ptr, address, 0x0, insn_ptr, size_ptr, count_ptr]
            );

            // Get results
            var insn = MKeystone.getValue(insn_ptr, '*');
            var size = MKeystone.getValue(size_ptr, 'i32');
            var count = MKeystone.getValue(count_ptr, 'i32');
            var asm = {
                mc: new Uint8Array(size),
                failed: Boolean(ret),
                count: count,
            };
            for (var i = 0; i < size; i++) {
                asm.mc[i] = MKeystone.getValue(insn + i, 'i8');
            }

            // Free memory and return object
            var ret = MKeystone.ccall('ks_free', 'void', ['pointer'], insn_ptr);
            MKeystone._free(buffer_ptr);
            MKeystone._free(insn_ptr);
            MKeystone._free(size_ptr);
            MKeystone._free(count_ptr);
            return asm
        };

        this.errno = function() {
            var handle = MKeystone.getValue(this.handle_ptr, '*');
            var ret = MKeystone.ccall('ks_errno', 'number', ['pointer'], [handle]);
            return ret;
        }

        this.close = function() {
            var handle = MKeystone.getValue(this.handle_ptr, '*');
            var ret = MKeystone.ccall('ks_close', 'number', ['pointer'], [handle]);
            if (ret != ks.ERR_OK) {
                var error = 'Keystone.js: Function ks_close failed with code ' + ret + ':\n' + MKeystone._ks_strerror(ret);
                throw error;
            }
            MKeystone._free(this.handle_ptr);
        }

        // Constructor
        var ret = MKeystone.ccall('ks_open', 'number',
            ['number', 'number', 'pointer'],
            [this.arch, this.mode, this.handle_ptr]
        );

        if (ret != ks.ERR_OK) {
            MKeystone.setValue(this.handle_ptr, 0, '*');
            var error = 'Keystone.js: Function ks_open failed with code ' + ret + ':\n' + MKeystone._ks_strerror(ret);
            throw error;
        }
    },
};

