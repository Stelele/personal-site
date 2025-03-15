import { Prop } from "../components/CodeBlock.vue"

const C = `#include "stdio.h"

int main(void) {
    printf("Hello World");
    return 0;
}`

const CPP = `#include <iostream>

int main(void) {
    std::cout << "Hello World";

    return 0;
}`

const GO = `package main

import "fmt"

func main() {
    fmt.Println("Hello World")
}`

const JAVA = `public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`

const JAVASCRIPT = `console.log('Hello World')`

const PHP = `<?php
    echo "Hello World";
?>`

const JULIA = `print("Hello World")`

const MATLAB = `disp('Hello, World!');`

const PYTHON = `print("Hello World")`

const MIPSASM = `    .data
phrase: .asciiz "Hello World\\n" # data location 

    .text
main:
    la $t0, phrase      # store phrase address in $t0
    move $a0, $t0       # move contents of $t0 into $a0
    li $v0, 4           # set print string to console operation
    syscall             # request and print string to console

    li $v0, 10          # exit program
    syscall`

export function getHelloWorlds() {
    const languages: Array<Prop> = [
        {
            label: "JavaScript",
            language: "javascript",
            icon: "vi-file-type-js",
            code: JAVASCRIPT,
        },
        {
            label: "Julia",
            language: "julia",
            icon: "vi-file-type-julia",
            code: JULIA,
        },

        {
            label: "Python",
            language: "python",
            icon: "vi-file-type-python",
            code: PYTHON,
        },
        {
            label: "MatLab",
            language: "matlab",
            icon: "vi-file-type-matlab",
            code: MATLAB,
        },
        {
            label: "PHP",
            language: "php",
            icon: "vi-file-type-php3",
            code: PHP,
        },
        {
            label: "Java",
            language: "java",
            icon: "vi-file-type-jar",
            code: JAVA,
        },
        {
            label: "Go",
            language: "go",
            icon: "vi-file-type-go",
            code: GO,
        },
        {
            label: "C++",
            language: "cpp",
            icon: "vi-file-type-cpp2",
            code: CPP,
        },
        {
            label: "C",
            language: "c",
            icon: "vi-file-type-c",
            code: C,
        },
        {
            label: "MIPS Assembly",
            language: "mipsasm",
            icon: "vi-file-type-binary",
            code: MIPSASM,
        },
    ]

    return languages
}