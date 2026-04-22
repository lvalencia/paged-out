# LSBEmbedding

This project is a [typescript](https://www.typescriptlang.org/) [deno](https://deno.com/) codebase for running demo PNG LSB Embedding / Extracting of Data

## How to

### Embed

```
% yarn run embed
```

will embed the `target.png` with the `secret_message` data file and output to `embedded.png`. All located in the `fixtures` folder

Note: Messge Size Extraction is Hardcoded, if you change the secret update the size in bytes you expect to extract

### Extract

```
% yarn run extract
```

will extract the message from `embedded.png` and output to `output_message`. All located in the `fixtures` folder