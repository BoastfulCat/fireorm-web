# FireORM-Web

[![NPM Version](https://img.shields.io/npm/v/fireorm-web.svg?style=flat)](https://www.npmjs.com/package/fireorm-web)
[![Typescript lang](https://img.shields.io/badge/Language-Typescript-Blue.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/npm/l/fireorm.svg?style=flat)](https://www.npmjs.com/package/fireorm)

FireORM for Web - is a tiny wrapper on top of web firebase package, based on [fireorm](https://github.com/wovalle/fireorm) codebase that makes life easier when dealing with a Firestore database. FireORM-Web tries to ease the development of apps that rely on Firestore at the database layer by abstracting the access layer providing a familiar repository pattern. It basically helps us not worry about Firestore details and focus on what matters: adding cool new features!

## Installation

1. Install the npm package:

```bash
npm install fireorm-web --save`
```

2. You need to install `reflect-metadata` shim:

```bash
npm install reflect-metadata --save
```

and import it somewhere in the global place of your app (for example in `app.ts`):

```ts
import "reflect-metadata";
```

3. TypeScript configuration

Also, make sure you are using TypeScript version **4.5** or higher,
and you have enabled the following settings in `tsconfig.json`:

```json
{
  "emitDecoratorMetadata": true,
  "experimentalDecorators": true
}
```

4. [Initialize](https://firebase.google.com/docs/firestore/quickstart#initialize) your Firestore application:

```ts
import {initializeApp} from 'firebase/app';
import {getFirestore} from 'firebase/firestore';
import {initialize} from 'fireorm-web';

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.SENDER_ID,
  appId: process.env.APP_ID,
};

// - or - 
// const firebaseConfig = require('/path_to_json/firestore.creds.json');

const firebaseApp = initializeApp(firebaseConfig);
const firebaseFirestore = getFirestore(firebaseApp);

initialize(firebaseFirestore);
```

## Usage

1. Create your Firestore models

```typescript
import { Collection } from 'fireorm-web';

@Collection()
class Todo {
  _id: string;
  text: string;
  done: Boolean;
}
```

2. And your domain logic looks like this

```ts
import { getRepository } from 'fireorm-web';

const todoRepository = getRepository(Todo);

const todo = new Todo();
todo.text = "Check FireORM-Web GitHub repository";
todo.done = false;

// Create record
const todoDocument = await todoRepository.create(todo);

// Read record
const mySuperTodoDocument = await todoRepository.findById(todoDocument._id);

// Update record
await todoRepository.update(mySuperTodoDocument);

// Delete record
await todoRepository.delete(mySuperTodoDocument._id);
```

## Firebase Complex Data Types

Firestore has support for [complex data types](https://firebase.google.com/docs/firestore/manage-data/data-types) such as GeoPoint and Reference. Full handling of complex data types is [being handled in this issue in fireorm](https://github.com/wovalle/fireorm/issues/58). Temporarily, fireorm and fireorm-web will export [Class Transformer's @Type](https://github.com/typestack/class-transformer#working-with-nested-objects) decorator. It receives a lamda where you return the type you want to cast to.

## Core Concepts

FireORM-Web is just a library to simplify the way we communicate with web firestore. It does not implement the underlying communication with the database (it resorts to official sdk's for that, such as [firebase](https://www.npmjs.com/package/firebase)).

## Firestore

According to [it's homepage](https://cloud.google.com/firestore), Firestore is a fast, fully managed, serverless, cloud-native NoSQL document database that simplifies storing, syncing, and querying data for your mobile, web, and IoT apps at global scale.

In Firestore, data is stored in _Documents_ which are organized into _Collections_ that may also contain _SubCollections_.

To take full advantage of what fireorm's have to offer, is recommended that you are familiarized with [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model).

## FireORM-Web Models

Models in fireorm-web are just a way to specify the shape that our data (or _Documents_) will have. Models are represented with [JavaScript Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)!

For example, let's pretend that we want to store information about Rock Bands:the band name, formation year and array of genres. Our Model would look like this:

```ts
class Band {
  _id: string;
  name: string;
  formationYear: number;
  genres: string[];
}
```

Wait, I only mentioned name, formationYear and genres in my original specification, so why does the model have a string property called `_id`? Because of the way the data is stored in Firestore, **it's required that every model contain a string property called _id**. If you create a model without the _id property (or with another data type such as Number or Symbol) fireorm-web won't work correctly.

### FireORM-Web Collections

Great, we have a model, but how can we ‘take’ our model and ‘store’ it the database? In Firestore we store data in _[Documents](https://firebase.google.com/docs/firestore/data-model#documents)_ and they are organized into _[Collections](https://firebase.google.com/docs/firestore/data-model#collections)_. To represent a Collection in our code, we'll use a fairly new JavaScript feature which Typescript lets us use super easy: [Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html).

To declare Collections we can just _decorate_ our model class with fireorm-web `Collection` decorator and each instance of the model would act as a Firestore Document.

```typescript
import { Collection } from 'fireorm-web';

@Collection()
class Band {
  _id: string;
  name: string;
  formationYear: number;
  genres: string[];
}
```

See how we're importing the `Collection` decorator from fireorm-web and we're decorating our Band class with it. Internally, fireorm-web will treat each instance of Band as a Firestore Document.

Wait, Firestore Collections must have a name. What will be the name of that collection? By default, fireorm-web will name the collections with the plural form of the Model name in lower case, in this case `bands`. If you want you use your own name, you can pass a string as the first parameter of the Decorator.

```typescript
@Collection('RockBands')
```

## Development

1.  Clone the project from github:

```bash
git clone git@github.com:BoastfulCat/fireorm-web.git
```

2.  Install the dependencies:

```bash
npm install
```

### Committing

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) as the commit messages convention.

### Release a new version

This repo uses [Semantic Release](https://github.com/semantic-release/semantic-release) to automatically release new versions as soon as they land on master.

Commits must follow [Angular's Git Commit Guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines).

Supported commit types (taken from [here](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#type)):

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor:** A code change that neither fixes a bug nor adds a feature
- **perf:** A code change that improves performance
- **test:** Adding missing or correcting existing tests
- **chore:** Changes to the build process or auxiliary tools and libraries such as documentation generation

## Contributing

Have a bug or a feature request? Please search [the issues](https://github.com/BoastfulCat/fireorm-web/issues) to prevent duplication. If you couldn't find what you were looking for, [proceed to open a new one](https://github.com/BoastfulCat/fireorm-web/issues/new). Pull requests are welcome!

## License

MIT © [BoastfulCat](https://github.com/BoastfulCat). See [LICENSE](https://github.com/BoastfulCat/fireorm-web/blob/main/LICENSE) for details.
