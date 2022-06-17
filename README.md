# FireORM-Web

[![NPM Version](https://img.shields.io/npm/v/fireorm-web.svg?style=flat)](https://www.npmjs.com/package/fireorm-web)
[![Typescript lang](https://img.shields.io/badge/Language-Typescript-Blue.svg)](https://www.typescriptlang.org)
[![License](https://img.shields.io/npm/l/fireorm.svg?style=flat)](https://www.npmjs.com/package/fireorm)

FireORM for Web - is a tiny wrapper on top of web firebase package, based on [fireorm](https://github.com/wovalle/fireorm) codebase that makes life easier when dealing with a Firestore database. FireORM-Web tries to ease the development of apps that rely on Firestore at the database layer by abstracting the access layer providing a familiar repository pattern. It basically helps us not worry about Firestore details and focus on what matters: adding cool new features!

## Contents
- [Installation](#installation)
- [Usage](#usage)
  - [Firebase Complex Data Types](#firebase-complex-data-types)
  - [Core Concepts](#core-concepts)
  - [Firestore](#firestore)
  - [Models](#fireorm-web-models)
  - [Collections](#fireorm-web-collections)
  - [Repositories](#fireorm-web-repositories)
- [Reading Data](#reading-data)
  - [Simple Queries](#simple-queries)
  - [Simple Queries with Realtime Updates](#simple-queries-with-realtime-updates)
  - [Complex Queries](#complex-queries)
  - [Complex Queries with Realtime Update](#complex-queries-with-realtime-update)
  - [Pipe for Post Processing](#pipe-for-post-processing)
  - [Search by Document Reference](#search-by-document-reference)
  - [Order By and Limit](#order-by-and-limit)
  - [Limitations on Complex queries](#limitations-on-complex-queries)
- [Manage Data](#manage-data)
  - [Create Documents](#create-documents)
  - [Update Documents](#update-documents)
  - [Delete Documents](#delete-documents)
- [SubCollections](#subcollections)
  - [Nested SubCollections](#nested-subcollections)
- [Transactions](#transactions)
  - [Transactions inside repositories](#transactions-inside-repositories)
  - [Transactions in multiple repositories](#transactions-in-multiple-repositories)
  - [Returning values from transactions](#returning-values-from-transactions)
  - [Transaction in subcollections](#transaction-in-subcollections)
  - [Limitations](#limitations)
- [Batches](#batches)
  - [Batches inside repositories](#batches-inside-repositories)
  - [Batches in multiple repositories](#batches-in-multiple-repositories)
  - [Batches in subcollections](#batches-in-subcollections)
  - [Limitations](#limitations-1)
- [Custom Repositories](#custom-repositories)
  - [Casting](#casting)
- [Validation](#validation)
- [Transformer](#transformer)
- [Utils](#utils)
- [Development](#development)
  - [Committing](#committing)
  - [Release a new version](#release-a-new-version)
- [Contributing](#contributing)
- [License](#license)

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

```ts
import { Collection } from 'fireorm-web';

@Collection()
class Todo {
  public _id: string;
  public text: string;
  public done: Boolean;
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

### Firebase Complex Data Types

Firestore has support for [complex data types](https://firebase.google.com/docs/firestore/manage-data/data-types) such as GeoPoint and Reference. Full handling of complex data types is [being handled in this issue in fireorm](https://github.com/wovalle/fireorm/issues/58). Temporarily, fireorm and fireorm-web will export [Class Transformer's @Type](https://github.com/typestack/class-transformer#working-with-nested-objects) decorator. It receives a lamda where you return the type you want to cast to.

### Core Concepts

FireORM-Web is just a library to simplify the way we communicate with web firestore. It does not implement the underlying communication with the database (it resorts to official sdk's for that, such as [firebase](https://www.npmjs.com/package/firebase)).

### Firestore

According to [it's homepage](https://cloud.google.com/firestore), Firestore is a fast, fully managed, serverless, cloud-native NoSQL document database that simplifies storing, syncing, and querying data for your mobile, web, and IoT apps at global scale.

In Firestore, data is stored in _Documents_ which are organized into _Collections_ that may also contain _SubCollections_.

To take full advantage of what fireorm-web have to offer, is recommended that you are familiarized with [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model).

### FireORM-Web Models

Models in fireorm-web are just a way to specify the shape that our data (or _Documents_) will have. Models are represented with [JavaScript Classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)!

For example, let's pretend that we want to store information about Rock Bands:the band name, formation year and array of genres. Our Model would look like this:

```ts
class Band {
  public _id: string;
  public name: string;
  public formationYear: number;
  public genres: string[];
}
```

Wait, I only mentioned name, formationYear and genres in my original specification, so why does the model have a string property called `_id`? Because of the way the data is stored in Firestore, **it's required that every model contain a string property called _id**. If you create a model without the `_id` property (or with another data type such as Number or Symbol) fireorm-web won't work correctly.

### FireORM-Web Collections

Great, we have a model, but how can we ‘take’ our model and ‘store’ it the database? In Firestore we store data in _[Documents](https://firebase.google.com/docs/firestore/data-model#documents)_ and they are organized into _[Collections](https://firebase.google.com/docs/firestore/data-model#collections)_. To represent a Collection in our code, we'll use a fairly new JavaScript feature which Typescript lets us use super easy: [Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html).

To declare Collections we can just _decorate_ our model class with fireorm-web `Collection` decorator and each instance of the model would act as a Firestore Document.

```ts
import { Collection } from 'fireorm-web';

@Collection()
class Band {
  public _id: string;
  public name: string;
  public formationYear: number;
  public genres: string[];
}
```

See how we're importing the `Collection` decorator from fireorm-web and we're decorating our Band class with it. Internally, fireorm-web will treat each instance of Band as a Firestore Document.

Wait, Firestore Collections must have a name. What will be the name of that collection? By default, fireorm-web will name the collections with the plural form of the Model name in lower case, in this case `bands`. If you want you use your own name, you can pass a string as the first parameter of the Decorator.

```ts
@Collection('RockBands')
```

### FireORM-Web Repositories

One of my goals when developing this library was to create a way to use the Repository Pattern with Firestore as easily as possible. We have our models, we have our collections, but how are we supposed to make CRUD operations? That’s what Repositories are for.

> In general, repositories are classes or components that encapsulate the logic required to access data sources. They centralize common data access functionality, providing better maintainability and decoupling the infrastructure or technology used to access databases from the domain model layer ([source](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)).

Repositories provide the necessary methods to create, retrieve, update and delete documents from our Firestore collections. To create a repository from a collection we can just call `getRepository` method.

```ts
import { Collection, getRepository } from 'fireorm-web';

@Collection()
class Band {
  public _id: string;
  public name: string;
  public formationYear: number;
  public genres: string[];
}

const bandRepository = getRepository(Band);
```

The variable `bandRepository` contains all the methods to interact with our `band`. You can retrieve, create, update, delete and do complex queries over our Bands collection!

## Reading Data

This is where fun starts! Once we have initialized fireorm-web in our application we can start using it.

We'll continue working with the Band's collection we defined in Core Concept's section.

### Simple Queries

FireORM-Web Repositories have the method `findById` which you can use to retrieve documents by its id.

Let's imagine we have a Document in our Bands Collection in firestore with an id `red-hot-chilli-peppers`. To retrieve it we only have to use the handy findById method in our repository.

```ts
import { Collection, getRepository } from 'fireorm-web';

@Collection()
class Band {
  public _id: string;
  public name: string;
  public formationYear: number;
  public genres: string[];
}

const bandRepository = getRepository(Band);

const band = await bandRepository.findById('red-hot-chilli-peppers');
```

Now the variable band is an instance of our Band model that contains the information about the band.

### Simple Queries with Realtime Updates

If you need to listen for updates document in realtime, you can use the "findByIdAndListen" method of the repository. In the arguments, you can specify callback functions that will be called when a data change detect or error.

```ts
function renderBandIten(band) {
  // ... some render logic
}

// find document and start listen
const unsubscribe = getRepository(Band)
  .findByIdAndListen('red-hot-chilli-peppers', renderBandIten, console.error);

// stop listen
unsubscribe();
```

This approach will be convenient when used in a single page application.

### Complex Queries

Only being able to find documents by id is a bit limiting, that's why fireorm-web repositories provide a lot of helper functions to ease the filtering of data in queries. These are `whereEqualTo`, `whereGreaterThan`, `whereGreaterOrEqualTha`, `whereLessThan`, `whereLessOrEqualThan`, `whereArrayContains`, `whereIn` and `whereArrayContainsAny` methods. We can pipe as many methods as we need to perform complex queries, as long as we don’t forget to call the `find` method at the end.

```ts
// Bands formed from 1990 onwards
await bandRepository
  .whereGreaterOrEqualThan('formationYear', 1990)
  .find();

// Bands whose name is Porcupine Tree
await bandRepository
  .whereEqualTo('name', 'Porcupine Tree')
  .find();

// Bands formed after 1985 and that play Progressive Rock
await bandRepository
  .whereGreaterThan('formationYear', 1985)
  .whereArrayContains('genres', 'progressive-rock')
  .find();
```

All the \*Where methods have a similar api, where the first parameter is a string that represents the field that we want to search for and the second one is the value that we want to compare to (which can be any [JavaScript primitive type](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Primitive_values)). FireORM-Web also provide an alternative API to make it more type safe; the first parameter can also accept a lamda function where it's first parameter is the type of the model of the repository.

```ts
// This example is exactly the same than the last one, but using the alternative API.

// Bands formed from 1990 onwards
await bandRepository
  .whereGreaterOrEqualThan((band) => band.formationYear, 1990)
  .find();

// Bands whose name is Porcupine Tree
await bandRepository
  .whereEqualTo((band) => band.name, 'Porcupine Tree')
  .find();

// Bands formed after 1985 and that play Progressive Rock
await bandRepository
  .whereGreaterThan((band) => band.formationYear, 1985)
  .whereArrayContains((band) => band.genres, 'progressive-rock')
  .find();
```

### Complex Queries with Realtime Update

Similar to `findByIdAndListen`, you can get data and listen for changes in real time. To do this, use the `findAndListen` method.

```ts
function renderBandList(bands) {
  // ... some render logic
}

// run querie and start listin
const unsubscribe = bandRepository.findAndListen(renderBandList, console.error);

// stop listen
unsubscribe();
```

### Pipe for Post Processing

Sometimes it is convenient to automatically process the received data. You can use the `pipe` method for this, passing any number of callbacks to it as arguments. This way you can transfer the filter, map and other data processing to the client side.

```ts
function filterBandsByYear(from: number, to: number) {
  return (items) => items.filter((item) => item.formationYear > from && item.formationYear < to);
}

function mapNameToLowerCase() {
  return (items) => items.map((item) => {
    item.name = item.name.toLowerCase();
    return item;
  });
}

await bandRepository
  .pipe(
    filterBandsByYear(1985, 1990),
    mapNameToLowerCase(),
  )
  .find();
```

### Search by Document Reference

We can use the document reference as the value in any of the helpers function described above.

```ts
// Fake DocumentReference
class FirestoreDocumentReference {
  public _id: string;
  public _path: string;
}

@Collection()
class BandWithReference {
  public _id: string;
  public name: string;
  public formationYear: number;
  public genres: string[];

  @Type(() => FirestoreDocumentReference)
  public relatedBand?: FirestoreDocumentReference;
}

const pt = new Band();

pt._id = 'porcupine-tree';
pt.name = 'Porcupine Tree';
pt.formationYear = 1987;
pt.genres = ['psychedelic-rock', 'progressive-rock', 'progressive-metal'];

await bandRepository.create(pt);

// Filter documents by a doc reference
const band1 = await bandRepository.whereEqualTo((item) => item.relatedBand, ptRef).find();

// Can also use the string api of the complex query
await band2 = bandRepository.whereEqualTo('relatedBand', ptRef).find();
```

### Order By and Limit

FireORM-Web repositories also provide functions to order documents and limit the quantity of documents that we will retrieve. These are `orderByAscending`, `orderByDescending`, `limit` and `offset`. Please be aware that you can only use one orderBy, one offset and one limit per query.

```ts
// Bands formed from 1990 onwards or
await bandRepository
  .whereGreaterOrEqualThan((band) => band.formationYear, 1990)
  .orderByAscending('name')
  .find();

// Top 10 bands whose formationYear is 1987 in ascending order by formationYear (using the alternative api)
await bandRepository
  .whereEqualTo((band) => band.formationYear, 1987)
  .orderByAscending((band) => band.formationYear)
  .limit(10)
  .find();

// Top 3 bands formed after 1985 and that play Progressive Rock, skip first
await bandRepository
  .whereGreaterThan((band) => band.formationYear, 1985)
  .whereArrayContains((band) => band.genres, 'progressive-rock')
  .offset(1)
  .limit(3)
  .find();
```
Be careful offset - [not recommended to google](https://cloud.google.com/firestore/docs/best-practices#read_and_write_operations)

### Limitations on Complex queries

Please be aware that fireorm-web cannot circumvent [Firestore query limitations](https://firebase.google.com/docs/firestore/query-data/queries#query_limitations), we still have to create indexes if we want to create queries that involve more than one field.

## Manage Data

Now that we know how to retrieve documents from Firestore, it's time to finish the rest of our CRUD operations.

### Create Documents

FireORM-Web repositories provide a `create` method to save new documents into Firestore. If at the moment of calling the `create` method you don't provide an `_id`, an autogenerated id will be used.

```ts
import { Collection, getRepository } from 'fireorm-web';
import Band from './wherever-our-models-are';

const bandRepository = getRepository(Band);
const rush = new Band();

rush.name = 'Rush';
rush.formationYear = 1968;
rush.genres = ['progressive-rock', 'hard-rock', 'heavy-metal'];

await bandRepository.create(rush);
```

### Update Documents

Not all information we store in Firestore will remain unedited forever, so we need a way to edit the data we already have. No worries, FireORM-Web repositories provide an `update` method to update the data we already have stored in our documents.

```ts
import { Collection, getRepository } from 'fireorm-web';
import Band from './wherever-our-models-are';

const bandRepository = getRepository(Band);
const rush = await bandRepository.findById('rush');

rush.name = 'rush';

await bandRepository.update(rush);
```

You can also specify a strategy for updating documents by passing options as the second argument.

```ts
await bandRepository.update(rush, {merge: true});
```

### Delete Documents

By now you know the drill. FireORM-Web repositories provide an `delete` method to delete documents.

```ts
import { Collection, getRepository } from 'fireorm-web';
import Band from './wherever-our-models-are';

const bandRepository = getRepository(Band);
const rush = await bandRepository.findById('rush');

await bandRepository.delete(rush);
```

## SubCollections

In the core concepts we learned that in Firestore we store data in _[Documents](https://firebase.google.com/docs/firestore/data-model#documents)_ and they are organized into [Collections](https://firebase.google.com/docs/firestore/data-model#collections). But in Firestore you can also add collections inside documents, they are called [Subcollections](https://firebase.google.com/docs/firestore/data-model#subcollections).

To represent a SubCollection in our code, we'll make use of fireorm-web `SubCollection` decorator.
For example, let’s create an Albums model and add it as a Subcollection of Band

```ts
import { Collection, SubCollection, Repository } from 'fireorm-web';

class Album {
  public _id: string;
  public name: string;
  public year: number;
}

@Collection()
class Band {
  public _id: string;
  public name: string;
  public formationYear: number;
  public genres: string[];

  @SubCollection(Album)
  public albums?: Repository<Album>;
}
```

In this case we created a model called Album to store each album information: a unique id (remember, models must have an id by design!), name and year. Once the model is created, we add a _albums_ property to the existing Band model and decorate it using fireorm-web `SubCollection` decorator passing Album model as the first parameter.

Notice how we didn't add the `Collection` Decorator to the Album class (we wanted it to be a SubCollection, not a Collection!) but added the `SubCollection` inside Band model.

By default, fireorm-web will name the SubCollections with the plural form of the model name that was passed as first parameter (in this case, it will be named `Albums`). If you want you use your own name, you can pass an string as the second parameter of the SubCollection Decorator.

```ts
@SubCollection(Album, 'TheAlbums')
```

### Nested SubCollections

FireORM-Web has support for nested subcollections (subcollections inside subcollections). To represent a nested subcollection we only have to use the `SubCollection` decorator inside a model that is itself a subcollection of another model.

```ts
import { Collection, SubCollection, Repository } from 'fireorm-web';

class Image {
  public _id: string;
  public url: string;
}

class Album {
  public _id: string;
  public name: string;
  public year: number;

  @SubCollection(Image)
  public images?: Repository<Image>;
}

@Collection()
class Band {
  public _id: string;
  public name: string;
  public formationYear: number;
  public genres: Array<string>;

  @SubCollection(Album)
  public albums?: Repository<Album>;
}
```

In this example we have a **Band** model that has a field called `albums` that represents the **Albums** subcollection that itself has a field called `images` that represents the **Images** subcollection (Band -> Album -> Image).

Please note that firestore supports [up to 100](https://firebase.google.com/docs/firestore/data-model#subcollections) nested subcollections.

## Transactions

FireORM-Web also has support for [Firestore Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions) inside a single repository and between multiple repositories.

### Transactions inside repositories

FireORM-Web repositories have a `runTransaction` method. It receives a lamda function where the first parameter corresponds to a `FirestoreTransactionRepository`. The `FirestoreTransactionRepository` is an special type of repository that has methods to create, retrieve, update and delete documents inside a transaction.

```ts
import { getRepository, Collection } from 'fireorm-web';
import Band from './wherever-our-models-are';

const bandRepository = getRepository(Band);
const dt = new Band();

dt._id = 'dream-theater';
dt.name = 'DreamTheater';
dt.formationYear = 1985;

bandRepository.runTransaction(async (tran) => {
  await tran.create(dt);
});
```

### Transactions in multiple repositories

FireORM-Web exports a `runTransaction` method that can be used to create transactions with one or multiple repositories. It receives a lamda function where the first parameter corresponds to a `FirestoreTransactionRepository` class. This class exposes a `getRepository` method that receives an Model class and returns a `FirestoreTransactionRepository` of the given entity and can be used to create, retrieve, update and delete documents inside a transaction.

```ts
import { runTransaction } from 'fireorm-web';
import { Band, Album } from './wherever-our-models-are';

const band = new Band();

band._id = 'dream-theater';
band.name = 'DreamTheater';
band.formationYear = 1985;

const album1 = new Album();

album1.name = 'When Dream and Day Unite';
album1.releaseDate = new Date('1989-03-06T00:00:00.000Z');
album1.bandId = band._id;

const album2 = new Album();

album2.name = 'Images and Words';
album2.releaseDate = new Date('1992-07-07T00:00:00.000Z');
album2.bandId = band._id;

await runTransaction(async (tran) => {
  const bandTranRepository = tran.getRepository(Band);
  const albumTranRepository = tran.getRepository(Album);

  await bandTranRepository.create(band);
  await albumTranRepository.create(album1);
  await albumTranRepository.create(album2);
});
```

### Returning values from transactions

If you need to return data from transactions, `runTransaction` receives a [type parameter](https://www.typescriptlang.org/docs/handbook/generics.html#using-type-parameters-in-generic-constraints) of the output value of your transaction.

```ts
import { runTransaction } from 'fireorm-web';
import { Band } from './wherever-our-models-are';

const band = new Band();

band.id = 'dream-theater';
band.name = 'DreamTheater';
band.formationYear = 1985;

await runTransaction<Band>(async (tran) => {
  const bandTranRepository = tran.getRepository(Band);
  const albumTranRepository = tran.getRepository(Album);

  return bandTranRepository.create(band);
});
```

### Transaction in subcollections

If we create an entity inside a transactions, all of its subcollections will be automatically be a `FirestoreTransactionRepository` that means that all of the operations done to subcollections will also be done inside transactions. Once the transaction is finished fireorm-web will automatically change the `FirestoreTransactionRepository` for a normal `FirestoreRepository` in case you need to reuse the entity.

```ts
import { runTransaction } from 'fireorm-web';
import { Band, Album } from './wherever-our-models-are';

const band = new Band();

band._id = 'tame-impala';
band.name = 'Tame Impala';
band.formationYear = 2007;

const albums = [
  {
    _id: 'currents',
    name: 'Currents',
    releaseDate: new Date('2015-07-17T00:00:00.000Z'),
  },
  {
    _id: 'slow-rush',
    name: 'The Slow Rush',
    releaseDate: new Date('2020-02-14T00:00:00.000Z'),
  },
];

await runTransaction<Band>(async (tran) => {
  const bandTranRepository = tran.getRepository(Band);

  // Create the band inside transaction.
  // Band contains a subcollection of Albums in the field albums, so when the band is created it will contain an albums field with FirestoreTransactionRepository<Album> type.
  const createdBand = await bandTranRepository.create(band);

  // Once the band is created, save the albums
  for (const album of albums) {
    await createdBand.albums.create(album);
  }

  // Outside of the transaction, albums will be a FirestoreRepository<Album>
  return createdBand;
});
```

### Limitations

Please be aware that Firestore has many limitations when working with transactions. You can learn more [here](https://firebase.google.com/docs/firestore/manage-data/transactions). The most notable ones are that inside Transactions all the read operations must be done first (i.e. if you need to fetch some documents from firestore and edit it inside a transaction, you must fetch everything you need before doing creating/updating/deleting any document). Also, transactions cannot contain any `limit`, `offset` or `orderBy` clauses.

## Batches

FireORM-Web also has support for Firestore's [Batched Writes](https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes).

### Batches inside repositories

FireORM-Web repositories have a `createBatch` method that returns a `FirestoreBatchRepository`. The `FirestoreBatchRepository` is an special type of repository that has methods to create, update and delete documents inside a batch. After adding all the operations that we want to run to the batch, we have to call the `commit` method to execute them.

```ts
import { getRepository, Collection } from 'fireorm-web';
import Band from './wherever-our-models-are';

const bandRepository = getRepository(Band);
const dt = new Band();

dt._id = 'dream-theater';
dt.name = 'DreamTheater';
dt.formationYear = 1985;

const batch = bandRepository.createBatch();

batch.create(dt);

await batch.commit();
```

### Batches in multiple repositories

FireORM-Web exports a `createBatch` method that can be used to create batches with one or multiple repositories. It receives a lamda function where the first parameter corresponds to a `FirestoreBatchStorage` class. This class exposes a `getRepository` method that receives an Model class and returns a `FirestoreBatchRepository` of the given entity and can be used to create, update and delete documents. Once all operations are defined, we have to call the `commit` method of our `FirestoreBatchRepository` to commit all the operations.

```ts
import { createBatch } from 'fireorm-web';
import { Band, Album } from './wherever-our-models-are';

const band = new Band();

band._id = 'dream-theater';
band.name = 'DreamTheater';
band.formationYear = 1985;

const album1 = new Album();

album1.name = 'When Dream and Day Unite';
album1.releaseDate = new Date('1989-03-06T00:00:00.000Z');
album1.bandId = band._id;

const album2 = new Album();

album2.name = 'Images and Words';
album2.releaseDate = new Date('1992-07-07T00:00:00.000Z');
album2.bandId = band._id;

const batch = createBatch();

const bandBatchRepository = batch.getRepository(Band);
const albumBatchRepository = batch.getRepository(Album);

bandBatchRepository.create(band);
albumBatchRepository.create(album1);
albumBatchRepository.create(album2);

await batch.commit();
```

### Batches in subcollections

FireORM-Web exports a `createBatch` method that can be used to create batches with one or multiple repositories. It receives a lamda function where the first parameter corresponds to a `FirestoreBatchStorage` class. This class exposes a `getRepository` method that receives an Model class and returns a `FirestoreBatchRepository` of the given entity and can be used to create, update and delete documents. Once all operations are defined, we have to call the `commit` method of our `FirestoreBatchRepository` to commit all the operations.

```ts
import Band from './wherever-our-models-are';
import Album from './wherever-our-models-are';

const bandRepository = getRepository(Band);
const band = bandRepository.findById('opeth');

// Initialize subcollection documents
const firstAlbum = new Album();

firstAlbum._id = 'blackwater-park';
firstAlbum.name = 'Blackwater Park';
firstAlbum.releaseDate = new Date('2001-12-03T00:00:00.000Z');

const secondAlbum = new Album();

secondAlbum._id = 'deliverance';
secondAlbum.name = 'Deliverance';
secondAlbum.releaseDate = new Date('2002-11-12T00:00:00.000Z');

// Create a batch for the subcollection
const albumsBatch = band.albums.createBatch();

// Add the subcollection entities
albumsBatch.create(firstAlbum);
albumsBatch.create(secondAlbum);

// Commit transaction
await albumsBatch.commit();
```

### Limitations

Please be aware that Firestore has many limitations when working with BatchedWrites. You can learn more [here](https://firebase.google.com/docs/firestore/manage-data/transactions).

## Custom Repositories

By default, fireorm-web repositories have methods to create, read, update and delete documents, but what if we want to add extra data access logic? FireORM-Web supports Custom Repositories. A Custom Repository is a class that extends FirestoreRepository<T>(where T is a model) and is decorated with fireorm-web `CustomRepository` decorator.

```ts
import { FirestoreRepository, CustomRepository, getRepository } from 'fireorm-web';
import Band from './wherever-our-models-are';

@CustomRepository(Band)
class CustomBandRepository extends FirestoreRepository<Band> {
  async getProgressiveRockBands(): Promise<Band[]> {
    return this.whereArrayContains('genres', 'progressive-rock').find();
  }
}

const bandRepository = getRepository(Band) as CustomBandRepository;
const bands = await bandRepository.getProgressiveRockBands();
```

Now, `getRepository(Band)` will return the custom repository for Band with the _getProgressiveRockBands_ method. If a model doesn’t have a custom repository, the base repository will be returned. FireORM-Web also provides `getCustomRepository` and `getBaseRepository` helpers if we don’t want the default behavior.

### Casting

As you could see in the previous example, we had to cast the repository returned by the `getRepository` as the custom repository we wanted to use (_CustomBandRepository_).

## Validation

FireORM-Web supports [class-validator](https://github.com/typestack/class-validator) validation decorators in any collection.

FireORM-Web depend on it explicitly. Enable model validation and config it, you may in `initialize` method call.

```ts
initialize(
    firebaseFirestore,
    {
      validateModels: true,
      validatorOptions: {
        skipNullProperties: true,
      },
    },
  );
```

and add validator 

```ts
import { Collection } from 'fireorm-web';
import { IsEmail } from 'class-validator';

@Collection()
class Band {
  @IsEmail()
  public contactEmail: string;
}
```

Use this in the same way that you would your other collections and it will validate whenever a document is saved or updated.

## Transformer

FireORM-Web supports [class-transformer](https://github.com/typestack/class-transformer) transform decorators in any collection.

FireORM-Web depend on it explicitly. Transformer is always applied and cannot be disabled. Config it, you may in `initialize` method call.

```ts
initialize(
  firebaseFirestore,
  {
    transformOptions: {
      exposeDefaultValues: false,
    },
  },
);
```
add class-transformer decorator
```ts
import { Collection } from 'fireorm-web';
import { Exclude, Transform, Type } from 'class-transformer';

@Collection()
class User {
  @Exclude({toClassOnly: true})
  public password: string;
}
```

Class transformer will be applied when you read or write data. Getters from the model do not get into the handler

## Utils

You can ask the fireorm-web to ignore the field when reading or writing data. Simply applying a decorator to it.

```ts
import { Collection, Ignore } from 'fireorm-web';

@Collection()
class Band {
  public _id: string;

  @Ignore()
  public name: string;
}
```

Or allows for serialization of properties.

```ts
import { Collection, Serialize } from 'fireorm-web';

class Website {
  public url: string;
}

@Collection()
class Band {
  public _id: string;

  @Serialize(Website)
  public website: Website;
}
```

Often you need to be able to quickly search for a record across various text fields or filter by an exact value. To do this, the fireorm-web has `Search` and `Filter` decorators, as well as special methods `searchInData` and `filterDataByParams` for processing the collection after it is loaded on the client. Each of the decorators supports a custom handler function.

```ts
import { Collection, Search, Filter, searchInData, filterDataByParams, getRepository } from 'fireorm-web';

@Collection()
class User {
  public _id: string;

  @Search()
  public name: string;

  @Search()
  public address: string;

  @Search((search: string | undefined, data: string): boolean => data.indexOf(`+${search}`) !== 1)
  public phone: string;
  
  @Filter()
  public active: boolean;
}

const users1 = await getRepository(User)
        .find()
        .filter((item) => searchInData('some_text', item))
        .filter((item) => filterDataByParams({field: 'active', value: true}, item));

// or use in pipe
const users2 = await getRepository(User)
        .pipe(
          (items) => items.filter((item) => searchInData('some_text', item)),
          (items) => items.filter((item) => filterDataByParams({field: 'active', value: true}, item)),
        )
        .find();
```

`Search` and `Filter` also supports SubCollections and nested data.

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
