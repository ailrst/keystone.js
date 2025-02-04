#!/usr/bin/python

# INFORMATION:
# This scripts compiles the original Keystone framework to JavaScript

import os
import sys

EXPORTED_FUNCTIONS = [
    '_ks_open',
    '_ks_asm',
    '_ks_free',
    '_ks_close',
    '_ks_option',
    '_ks_strerror',
    '_ks_errno',
    '_ks_arch_supported',
    '_ks_version',
    '_malloc',
    '_free',
    'ccall',
    'setValue',
    'getValue',
    'stringToUTF8',
]

EXPORTED_CONSTANTS = [
    'bindings/nodejs/consts/arm.js',
    'bindings/nodejs/consts/arm64.js',
    'bindings/nodejs/consts/hexagon.js',
    'bindings/nodejs/consts/keystone.js',
    'bindings/nodejs/consts/mips.js',
    'bindings/nodejs/consts/ppc.js',
    'bindings/nodejs/consts/sparc.js',
    'bindings/nodejs/consts/systemz.js',
    'bindings/nodejs/consts/x86.js',
]

# Directories
KEYSTONE_DIR = os.path.abspath("keystone")

def generateConstants():
    out = open('src/keystone-constants.js', 'w')
    for path in EXPORTED_CONSTANTS:
        path = os.path.join(KEYSTONE_DIR, path)
        with open(path, 'r') as f:
            code = f.read().replace('module.exports', 'ks')
        out.write(code)
    out.close()

def compileKeystone(targets):
    # CMake
    cmd = 'emcmake cmake'
    cmd += ' -DCMAKE_BUILD_TYPE=Release'
    cmd += ' -DBUILD_SHARED_LIBS=OFF'
    cmd += ' -DCMAKE_CXX_FLAGS="-Os"'
    if targets:
        cmd += ' -DLLVM_TARGETS_TO_BUILD="%s"' % (';'.join(targets))
    #else:
    #    cmd += ' -DLLVM_TARGETS_TO_BUILD="all"'
    if os.name == 'nt':
        cmd += ' -DMINGW=ON'
        cmd += ' -G \"MinGW Makefiles\"'
    if os.name == 'posix':
        cmd += ' -G \"Unix Makefiles\"'
    #cmd += ' keystone/CMakeLists.txt'
    os.chdir('keystone')
    print(cmd)
    os.system(cmd)

    # MinGW (Windows) or Make (Linux/Unix)
    if os.name == 'nt':
        os.system('mingw32-make')
    if os.name == 'posix':
        os.system('emmake make -j8')
    os.chdir('..')

    # Compile static library to JavaScript
    cmd = os.path.expandvars('emcc')
    cmd += ' -Os -sWASM=0'
    cmd += ' keystone/llvm/lib/libkeystone.a'
    cmd += ' -s EXPORTED_FUNCTIONS=\"[\''+ '\', \''.join(EXPORTED_FUNCTIONS) +'\']\"'
    cmd += ' -s MODULARIZE=1'
    cmd += ' -s EXPORT_NAME="\'MKeystone\'"'
    if targets:
        cmd += ' -o src/libkeystone-%s.out.js' % '-'.join(targets).lower()
    else:
        cmd += ' -o src/libkeystone.out.js'

    print(cmd)
    os.system(cmd)


if __name__ == "__main__":
    # Initialize Keystone submodule if necessary
    if not os.listdir(KEYSTONE_DIR):
        os.system("git submodule update --init")
    # Compile Keystone
    targets = sorted(sys.argv[1:])
    if os.name in ['nt', 'posix']:
        generateConstants()
        compileKeystone(targets)
    else:
        print("Your operating system is not supported by this script:")
        print("Please, use Emscripten to compile Keystone manually to src/libkeystone.out.js")
