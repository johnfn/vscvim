# VSCVim
## Vi/Vim emulation for Visual Studio Code

I'm trying to make Vim work in Visual Studio Code. Wouldn't that be great?!? If you want to help, feel free to reach out. Turns out Vim is fairly complicated

### Things that need to be done

* Everything

### Stuff I learned while making this extension

Changing the build configuration is a bit tricky. VSCode has made their own custom core lib.d.ts files. They add the noLib flag to tsconfig.json so that they can substitute these changed files. (It's a one line difference.) typings/vscode-typings.d.ts is the correct include to get all core typescript definition files.

Babel currently has a bug where, if you're using regenerator, nothing works at all. The only solution is to revert to an old version of Babel. See here: https://phabricator.babeljs.io/T2954