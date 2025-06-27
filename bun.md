To get started, import HTML files and pass them to the `routes` option in `Bun.serve()`.

```ts
import { sql, serve } from "bun";
import dashboard from "./dashboard.html";
import homepage from "./index.html";

const server = serve({
  routes: {
    // ** HTML imports **
    // Bundle & route index.html to "/". This uses HTMLRewriter to scan the HTML for `<script>` and `<link>` tags, run's Bun's JavaScript & CSS bundler on them, transpiles any TypeScript, JSX, and TSX, downlevels CSS with Bun's CSS parser and serves the result.
    "/": homepage,
    // Bundle & route dashboard.html to "/dashboard"
    "/dashboard": dashboard,

    // ** API endpoints ** (Bun v1.2.3+ required)
    "/api/users": {
      async GET(req) {
        const users = await sql`SELECT * FROM users`;
        return Response.json(users);
      },
      async POST(req) {
        const { name, email } = await req.json();
        const [user] =
          await sql`INSERT INTO users (name, email) VALUES (${name}, ${email})`;
        return Response.json(user);
      },
    },
    "/api/users/:id": async req => {
      const { id } = req.params;
      const [user] = await sql`SELECT * FROM users WHERE id = ${id}`;
      return Response.json(user);
    },
  },

  // Enable development mode for:
  // - Detailed error messages
  // - Hot reloading (Bun v1.2.3+ required)
  development: true,

  // Prior to v1.2.3, the `fetch` option was used to handle all API requests. It is now optional.
  // async fetch(req) {
  //   // Return 404 for unmatched routes
  //   return new Response("Not Found", { status: 404 });
  // },
});

console.log(`Listening on ${server.url}`);
```

```bash
$ bun run app.ts
```

## HTML imports are routes

The web starts with HTML, and so does Bun's fullstack dev server.

To specify entrypoints to your frontend, import HTML files into your JavaScript/TypeScript/TSX/JSX files.

```ts
import dashboard from "./dashboard.html";
import homepage from "./index.html";
```

These HTML files are used as routes in Bun's dev server you can pass to `Bun.serve()`.

```ts
Bun.serve({
  routes: {
    "/": homepage,
    "/dashboard": dashboard,
  }

  fetch(req) {
    // ... api requests
  },
});
```

When you make a request to `/dashboard` or `/`, Bun automatically bundles the `<script>` and `<link>` tags in the HTML files, exposes them as static routes, and serves the result.

An index.html file like this:

```html#index.html
<!DOCTYPE html>
<html>
  <head>
    <title>Home</title>
    <link rel="stylesheet" href="./reset.css" />
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./sentry-and-preloads.ts"></script>
    <script type="module" src="./my-app.tsx"></script>
  </body>
</html>
```

Becomes something like this:

```html#index.html
<!DOCTYPE html>
<html>
  <head>
    <title>Home</title>
    <link rel="stylesheet" href="/index-[hash].css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index-[hash].js"></script>
  </body>
</html>
```

### How to use with React

To use React in your client-side code, import `react-dom/client` and render your app.

{% codetabs %}

```ts#src/backend.ts
import dashboard from "../public/dashboard.html";
import { serve } from "bun";

serve({
  routes: {
    "/": dashboard,
  },

  async fetch(req) {
    // ...api requests
    return new Response("hello world");
  },
});
```

```ts#src/frontend.tsx
import "./styles.css";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root"));
  root.render(<App />);
});
```

```html#public/dashboard.html
<!DOCTYPE html>
<html>
  <head>
    <title>Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="../src/frontend.tsx"></script>
  </body>
</html>
```

```css#src/styles.css
body {
  background-color: red;
}
```

```tsx#src/app.tsx
export function App() {
  return <div>Hello World</div>;
}
```

{% /codetabs %}

### Development mode

When building locally, enable development mode by setting `development: true` in `Bun.serve()`.

```js-diff
import homepage from "./index.html";
import dashboard from "./dashboard.html";

Bun.serve({
  routes: {
    "/": homepage,
    "/dashboard": dashboard,
  }

+ development: true,

  fetch(req) {
    // ... api requests
  },
});
```

When `development` is `true`, Bun will:

- Include the `SourceMap` header in the response so that devtools can show the original source code
- Disable minification
- Re-bundle assets on each request to a .html file
- Enable hot module reloading (unless `hmr: false` is set)

#### Echo console logs from browser to terminal

Bun.serve() supports echoing console logs from the browser to the terminal.

To enable this, pass `console: true` in the `development` object in `Bun.serve()`.

```ts
import homepage from "./index.html";

Bun.serve({
  // development can also be an object.
  development: {
    // Enable Hot Module Reloading
    hmr: true,

    // Echo console logs from the browser to the terminal
    console: true,
  },

  routes: {
    "/": homepage,
  },
});
```

When `console: true` is set, Bun will stream console logs from the browser to the terminal. This reuses the existing WebSocket connection from HMR to send the logs.

#### Production mode

Hot reloading and `development: true` helps you iterate quickly, but in production, your server should be as fast as possible and have as few external dependencies as possible.

##### Ahead of time bundling (recommended)

As of Bun v1.2.17, you can use `Bun.build` or `bun build` to bundle your full-stack application ahead of time.

```sh
$ bun build --target=bun --production --outdir=dist ./src/index.ts
```

When Bun's bundler sees an HTML import from server-side code, it will bundle the referenced JavaScript/TypeScript/TSX/JSX and CSS files into a manifest object that Bun.serve() can use to serve the assets.

```ts
import { serve } from "bun";
import index from "./index.html";

serve({
  routes: { "/": index },
});
```

{% details summary="Internally, the `index` variable is a manifest object that looks something like this" %}

```json
{
  "index": "./index.html",
  "files": [
    {
      "input": "index.html",
      "path": "./index-f2me3qnf.js",
      "loader": "js",
      "isEntry": true,
      "headers": {
        "etag": "eet6gn75",
        "content-type": "text/javascript;charset=utf-8"
      }
    },
    {
      "input": "index.html",
      "path": "./index.html",
      "loader": "html",
      "isEntry": true,
      "headers": {
        "etag": "r9njjakd",
        "content-type": "text/html;charset=utf-8"
      }
    },
    {
      "input": "index.html",
      "path": "./index-gysa5fmk.css",
      "loader": "css",
      "isEntry": true,
      "headers": {
        "etag": "50zb7x61",
        "content-type": "text/css;charset=utf-8"
      }
    },
    {
      "input": "logo.svg",
      "path": "./logo-kygw735p.svg",
      "loader": "file",
      "isEntry": false,
      "headers": {
        "etag": "kygw735p",
        "content-type": "application/octet-stream"
      }
    },
    {
      "input": "react.svg",
      "path": "./react-ck11dneg.svg",
      "loader": "file",
      "isEntry": false,
      "headers": {
        "etag": "ck11dneg",
        "content-type": "application/octet-stream"
      }
    }
  ]
}
```

{% /details %}

##### Runtime bundling

When adding a build step is too complicated, you can set `development: false` in `Bun.serve()`.

- Enable in-memory caching of bundled assets. Bun will bundle assets lazily on the first request to an `.html` file, and cache the result in memory until the server restarts.
- Enables `Cache-Control` headers and `ETag` headers
- Minifies JavaScript/TypeScript/TSX/JSX files

## Plugins

Bun's [bundler plugins](https://bun.sh/docs/bundler/plugins) are also supported when bundling static routes.

To configure plugins for `Bun.serve`, add a `plugins` array in the `[serve.static]` section of your `bunfig.toml`.

### Using TailwindCSS in HTML routes

For example, enable TailwindCSS on your routes by installing and adding the `bun-plugin-tailwind` plugin:

```sh
$ bun add bun-plugin-tailwind
```

```toml#bunfig.toml
[serve.static]
plugins = ["bun-plugin-tailwind"]
```

This will allow you to use TailwindCSS utility classes in your HTML and CSS files. All you need to do is import `tailwindcss` somewhere:

```html#index.html
<!doctype html>
<html>
  <head>
    <title>Home</title>
    <link rel="stylesheet" href="tailwindcss" />
  </head>
  <body>
    <!-- the rest of your HTML... -->
  </body>
</html>
```

Or in your CSS:

```css#style.css
@import "tailwindcss";
```

### Custom plugins

Any JS file or module which exports a [valid bundler plugin object](https://bun.sh/docs/bundler/plugins#usage) (essentially an object with a `name` and `setup` field) can be placed inside the `plugins` array:

```toml#bunfig.toml
[serve.static]
plugins = ["./my-plugin-implementation.ts"]
```

Bun will lazily resolve and load each plugin and use them to bundle your routes.

Note: this is currently in `bunfig.toml` to make it possible to know statically which plugins are in use when we eventually integrate this with the `bun build` CLI. These plugins work in `Bun.build()`'s JS API, but are not yet supported in the CLI.

## How this works

Bun uses [`HTMLRewriter`](/docs/api/html-rewriter) to scan for `<script>` and `<link>` tags in HTML files, uses them as entrypoints for [Bun's bundler](/docs/bundler), generates an optimized bundle for the JavaScript/TypeScript/TSX/JSX and CSS files, and serves the result.

1. **`<script>` processing**
   - Transpiles TypeScript, JSX, and TSX in `<script>` tags
   - Bundles imported dependencies
   - Generates sourcemaps for debugging
   - Minifies when `development` is not `true` in `Bun.serve()`

   ```html
   <script type="module" src="./counter.tsx"></script>
   ```

2. **`<link>` processing**
   - Processes CSS imports and `<link>` tags
   - Concatenates CSS files
   - Rewrites `url` and asset paths to include content-addressable hashes in URLs

   ```html
   <link rel="stylesheet" href="./styles.css" />
   ```

3. **`<img>` & asset processing**
   - Links to assets are rewritten to include content-addressable hashes in URLs
   - Small assets in CSS files are inlined into `data:` URLs, reducing the total number of HTTP requests sent over the wire

4. **Rewrite HTML**
   - Combines all `<script>` tags into a single `<script>` tag with a content-addressable hash in the URL
   - Combines all `<link>` tags into a single `<link>` tag with a content-addressable hash in the URL
   - Outputs a new HTML file

5. **Serve**
   - All the output files from the bundler are exposed as static routes, using the same mechanism internally as when you pass a `Response` object to [`static` in `Bun.serve()`](/docs/api/http#static-routes).

This works similarly to how [`Bun.build` processes HTML files](/docs/bundler/html).

## This is a work in progress

- This doesn't support `bun build` yet. It also will in the future.

Bun natively implements a high-performance [SQLite3](https://www.sqlite.org/) driver. To use it import from the built-in `bun:sqlite` module.

```ts
import { Database } from "bun:sqlite";

const db = new Database(":memory:");
const query = db.query("select 'Hello world' as message;");
query.get(); // => { message: "Hello world" }
```

The API is simple, synchronous, and fast. Credit to [better-sqlite3](https://github.com/JoshuaWise/better-sqlite3) and its contributors for inspiring the API of `bun:sqlite`.

Features include:

- Transactions
- Parameters (named & positional)
- Prepared statements
- Datatype conversions (`BLOB` becomes `Uint8Array`)
- Map query results to classes without an ORM - `query.as(MyClass)`
- The fastest performance of any SQLite driver for JavaScript
- `bigint` support
- Multi-query statements (e.g. `SELECT 1; SELECT 2;`) in a single call to database.run(query)

The `bun:sqlite` module is roughly 3-6x faster than `better-sqlite3` and 8-9x faster than `deno.land/x/sqlite` for read queries. Each driver was benchmarked against the [Northwind Traders](https://github.com/jpwhite3/northwind-SQLite3/blob/46d5f8a64f396f87cd374d1600dbf521523980e8/Northwind_large.sqlite.zip) dataset. View and run the [benchmark source](https://github.com/oven-sh/bun/tree/main/bench/sqlite).

{% image width="738" alt="SQLite benchmarks for Bun, better-sqlite3, and deno.land/x/sqlite" src="https://user-images.githubusercontent.com/709451/168459263-8cd51ca3-a924-41e9-908d-cf3478a3b7f3.png" caption="Benchmarked on an M1 MacBook Pro (64GB) running macOS 12.3.1" /%}

## Database

To open or create a SQLite3 database:

```ts
import { Database } from "bun:sqlite";

const db = new Database("mydb.sqlite");
```

To open an in-memory database:

```ts
import { Database } from "bun:sqlite";

// all of these do the same thing
const db = new Database(":memory:");
const db = new Database();
const db = new Database("");
```

To open in `readonly` mode:

```ts
import { Database } from "bun:sqlite";
const db = new Database("mydb.sqlite", { readonly: true });
```

To create the database if the file doesn't exist:

```ts
import { Database } from "bun:sqlite";
const db = new Database("mydb.sqlite", { create: true });
```

### Strict mode

{% callout %}
Added in Bun v1.1.14
{% /callout %}

By default, `bun:sqlite` requires binding parameters to include the `$`, `:`, or `@` prefix, and does not throw an error if a parameter is missing.

To instead throw an error when a parameter is missing and allow binding without a prefix, set `strict: true` on the `Database` constructor:

<!-- prettier-ignore -->
```ts
import { Database } from "bun:sqlite";

const strict = new Database(
  ":memory:",
  { strict: true }
);

// throws error because of the typo:
const query = strict
  .query("SELECT $message;")
  .all({ message: "Hello world" });

const notStrict = new Database(
  ":memory:"
);
// does not throw error:
notStrict
  .query("SELECT $message;")
  .all({ message: "Hello world" });
```

### Load via ES module import

You can also use an import attribute to load a database.

```ts
import db from "./mydb.sqlite" with { "type": "sqlite" };

console.log(db.query("select * from users LIMIT 1").get());
```

This is equivalent to the following:

```ts
import { Database } from "bun:sqlite";
const db = new Database("./mydb.sqlite");
```

### `.close(throwOnError: boolean = false)`

To close a database connection, but allow existing queries to finish, call `.close(false)`:

```ts
const db = new Database();
// ... do stuff
db.close(false);
```

To close the database and throw an error if there are any pending queries, call `.close(true)`:

```ts
const db = new Database();
// ... do stuff
db.close(true);
```

Note: `close(false)` is called automatically when the database is garbage collected. It is safe to call multiple times but has no effect after the first.

### `using` statement

You can use the `using` statement to ensure that a database connection is closed when the `using` block is exited.

```ts
import { Database } from "bun:sqlite";

{
  using db = new Database("mydb.sqlite");
  using query = db.query("select 'Hello world' as message;");
  console.log(query.get()); // => { message: "Hello world" }
}
```

### `.serialize()`

`bun:sqlite` supports SQLite's built-in mechanism for [serializing](https://www.sqlite.org/c3ref/serialize.html) and [deserializing](https://www.sqlite.org/c3ref/deserialize.html) databases to and from memory.

```ts
const olddb = new Database("mydb.sqlite");
const contents = olddb.serialize(); // => Uint8Array
const newdb = Database.deserialize(contents);
```

Internally, `.serialize()` calls [`sqlite3_serialize`](https://www.sqlite.org/c3ref/serialize.html).

### `.query()`

Use the `db.query()` method on your `Database` instance to [prepare](https://www.sqlite.org/c3ref/prepare.html) a SQL query. The result is a `Statement` instance that will be cached on the `Database` instance. _The query will not be executed._

```ts
const query = db.query(`select "Hello world" as message`);
```

{% callout %}

**Note** — Use the `.prepare()` method to prepare a query _without_ caching it on the `Database` instance.

```ts
// compile the prepared statement
const query = db.prepare("SELECT * FROM foo WHERE bar = ?");
```

{% /callout %}

## WAL mode

SQLite supports [write-ahead log mode](https://www.sqlite.org/wal.html) (WAL) which dramatically improves performance, especially in situations with many concurrent readers and a single writer. It's broadly recommended to enable WAL mode for most typical applications.

To enable WAL mode, run this pragma query at the beginning of your application:

```ts
db.exec("PRAGMA journal_mode = WAL;");
```

{% details summary="What is WAL mode" %}
In WAL mode, writes to the database are written directly to a separate file called the "WAL file" (write-ahead log). This file will be later integrated into the main database file. Think of it as a buffer for pending writes. Refer to the [SQLite docs](https://www.sqlite.org/wal.html) for a more detailed overview.

On macOS, WAL files may be persistent by default. This is not a bug, it is how macOS configured the system version of SQLite.
{% /details %}

## Statements

A `Statement` is a _prepared query_, which means it's been parsed and compiled into an efficient binary form. It can be executed multiple times in a performant way.

Create a statement with the `.query` method on your `Database` instance.

```ts
const query = db.query(`select "Hello world" as message`);
```

Queries can contain parameters. These can be numerical (`?1`) or named (`$param` or `:param` or `@param`).

```ts
const query = db.query(`SELECT ?1, ?2;`);
const query = db.query(`SELECT $param1, $param2;`);
```

Values are bound to these parameters when the query is executed. A `Statement` can be executed with several different methods, each returning the results in a different form.

### Binding values

To bind values to a statement, pass an object to the `.all()`, `.get()`, `.run()`, or `.values()` method.

```ts
const query = db.query(`select $message;`);
query.all({ $message: "Hello world" });
```

You can bind using positional parameters too:

```ts
const query = db.query(`select ?1;`);
query.all("Hello world");
```

#### `strict: true` lets you bind values without prefixes

{% callout %}
Added in Bun v1.1.14
{% /callout %}

By default, the `$`, `:`, and `@` prefixes are **included** when binding values to named parameters. To bind without these prefixes, use the `strict` option in the `Database` constructor.

```ts
import { Database } from "bun:sqlite";

const db = new Database(":memory:", {
  // bind values without prefixes
  strict: true,
});

const query = db.query(`select $message;`);

// strict: true
query.all({ message: "Hello world" });

// strict: false
// query.all({ $message: "Hello world" });
```

### `.all()`

Use `.all()` to run a query and get back the results as an array of objects.

```ts
const query = db.query(`select $message;`);
query.all({ $message: "Hello world" });
// => [{ message: "Hello world" }]
```

Internally, this calls [`sqlite3_reset`](https://www.sqlite.org/capi3ref.html#sqlite3_reset) and repeatedly calls [`sqlite3_step`](https://www.sqlite.org/capi3ref.html#sqlite3_step) until it returns `SQLITE_DONE`.

### `.get()`

Use `.get()` to run a query and get back the first result as an object.

```ts
const query = db.query(`select $message;`);
query.get({ $message: "Hello world" });
// => { $message: "Hello world" }
```

Internally, this calls [`sqlite3_reset`](https://www.sqlite.org/capi3ref.html#sqlite3_reset) followed by [`sqlite3_step`](https://www.sqlite.org/capi3ref.html#sqlite3_step) until it no longer returns `SQLITE_ROW`. If the query returns no rows, `undefined` is returned.

### `.run()`

Use `.run()` to run a query and get back `undefined`. This is useful for schema-modifying queries (e.g. `CREATE TABLE`) or bulk write operations.

```ts
const query = db.query(`create table foo;`);
query.run();
// {
//   lastInsertRowid: 0,
//   changes: 0,
// }
```

Internally, this calls [`sqlite3_reset`](https://www.sqlite.org/capi3ref.html#sqlite3_reset) and calls [`sqlite3_step`](https://www.sqlite.org/capi3ref.html#sqlite3_step) once. Stepping through all the rows is not necessary when you don't care about the results.

{% callout %}
Since Bun v1.1.14, `.run()` returns an object with two properties: `lastInsertRowid` and `changes`.
{% /callout %}

The `lastInsertRowid` property returns the ID of the last row inserted into the database. The `changes` property is the number of rows affected by the query.

### `.as(Class)` - Map query results to a class

{% callout %}
Added in Bun v1.1.14
{% /callout %}

Use `.as(Class)` to run a query and get back the results as instances of a class. This lets you attach methods & getters/setters to results.

```ts
class Movie {
  title: string;
  year: number;

  get isMarvel() {
    return this.title.includes("Marvel");
  }
}

const query = db.query("SELECT title, year FROM movies").as(Movie);
const movies = query.all();
const first = query.get();
console.log(movies[0].isMarvel); // => true
console.log(first.isMarvel); // => true
```

As a performance optimization, the class constructor is not called, default initializers are not run, and private fields are not accessible. This is more like using `Object.create` than `new`. The class's prototype is assigned to the object, methods are attached, and getters/setters are set up, but the constructor is not called.

The database columns are set as properties on the class instance.

### `.iterate()` (`@@iterator`)

Use `.iterate()` to run a query and incrementally return results. This is useful for large result sets that you want to process one row at a time without loading all the results into memory.

```ts
const query = db.query("SELECT * FROM foo");
for (const row of query.iterate()) {
  console.log(row);
}
```

You can also use the `@@iterator` protocol:

```ts
const query = db.query("SELECT * FROM foo");
for (const row of query) {
  console.log(row);
}
```

This feature was added in Bun v1.1.31.

### `.values()`

Use `values()` to run a query and get back all results as an array of arrays.

```ts
const query = db.query(`select $message;`);
query.values({ $message: "Hello world" });

query.values(2);
// [
//   [ "Iron Man", 2008 ],
//   [ "The Avengers", 2012 ],
//   [ "Ant-Man: Quantumania", 2023 ],
// ]
```

Internally, this calls [`sqlite3_reset`](https://www.sqlite.org/capi3ref.html#sqlite3_reset) and repeatedly calls [`sqlite3_step`](https://www.sqlite.org/capi3ref.html#sqlite3_step) until it returns `SQLITE_DONE`.

### `.finalize()`

Use `.finalize()` to destroy a `Statement` and free any resources associated with it. Once finalized, a `Statement` cannot be executed again. Typically, the garbage collector will do this for you, but explicit finalization may be useful in performance-sensitive applications.

```ts
const query = db.query("SELECT title, year FROM movies");
const movies = query.all();
query.finalize();
```

### `.toString()`

Calling `toString()` on a `Statement` instance prints the expanded SQL query. This is useful for debugging.

```ts
import { Database } from "bun:sqlite";

// setup
const query = db.query("SELECT $param;");

console.log(query.toString()); // => "SELECT NULL"

query.run(42);
console.log(query.toString()); // => "SELECT 42"

query.run(365);
console.log(query.toString()); // => "SELECT 365"
```

Internally, this calls [`sqlite3_expanded_sql`](https://www.sqlite.org/capi3ref.html#sqlite3_expanded_sql). The parameters are expanded using the most recently bound values.

## Parameters

Queries can contain parameters. These can be numerical (`?1`) or named (`$param` or `:param` or `@param`). Bind values to these parameters when executing the query:

{% codetabs %}

```ts#Query
const query = db.query("SELECT * FROM foo WHERE bar = $bar");
const results = query.all({
  $bar: "bar",
});
```

```json#Results
[
  { "$bar": "bar" }
]
```

{% /codetabs %}

Numbered (positional) parameters work too:

{% codetabs %}

```ts#Query
const query = db.query("SELECT ?1, ?2");
const results = query.all("hello", "goodbye");
```

```ts#Results
[
  {
    "?1": "hello",
    "?2": "goodbye"
  }
]
```

{% /codetabs %}

## Integers

sqlite supports signed 64 bit integers, but JavaScript only supports signed 52 bit integers or arbitrary precision integers with `bigint`.

`bigint` input is supported everywhere, but by default `bun:sqlite` returns integers as `number` types. If you need to handle integers larger than 2^53, set `safeIntegers` option to `true` when creating a `Database` instance. This also validates that `bigint` passed to `bun:sqlite` do not exceed 64 bits.

By default, `bun:sqlite` returns integers as `number` types. If you need to handle integers larger than 2^53, you can use the `bigint` type.

### `safeIntegers: true`

{% callout %}
Added in Bun v1.1.14
{% /callout %}

When `safeIntegers` is `true`, `bun:sqlite` will return integers as `bigint` types:

```ts
import { Database } from "bun:sqlite";

const db = new Database(":memory:", { safeIntegers: true });
const query = db.query(
  `SELECT ${BigInt(Number.MAX_SAFE_INTEGER) + 102n} as max_int`,
);
const result = query.get();
console.log(result.max_int); // => 9007199254741093n
```

When `safeIntegers` is `true`, `bun:sqlite` will throw an error if a `bigint` value in a bound parameter exceeds 64 bits:

```ts
import { Database } from "bun:sqlite";

const db = new Database(":memory:", { safeIntegers: true });
db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, value INTEGER)");

const query = db.query("INSERT INTO test (value) VALUES ($value)");

try {
  query.run({ $value: BigInt(Number.MAX_SAFE_INTEGER) ** 2n });
} catch (e) {
  console.log(e.message); // => BigInt value '81129638414606663681390495662081' is out of range
}
```

### `safeIntegers: false` (default)

When `safeIntegers` is `false`, `bun:sqlite` will return integers as `number` types and truncate any bits beyond 53:

```ts
import { Database } from "bun:sqlite";

const db = new Database(":memory:", { safeIntegers: false });
const query = db.query(
  `SELECT ${BigInt(Number.MAX_SAFE_INTEGER) + 102n} as max_int`,
);
const result = query.get();
console.log(result.max_int); // => 9007199254741092
```

## Transactions

Transactions are a mechanism for executing multiple queries in an _atomic_ way; that is, either all of the queries succeed or none of them do. Create a transaction with the `db.transaction()` method:

```ts
const insertCat = db.prepare("INSERT INTO cats (name) VALUES ($name)");
const insertCats = db.transaction(cats => {
  for (const cat of cats) insertCat.run(cat);
});
```

At this stage, we haven't inserted any cats! The call to `db.transaction()` returns a new function (`insertCats`) that _wraps_ the function that executes the queries.

To execute the transaction, call this function. All arguments will be passed through to the wrapped function; the return value of the wrapped function will be returned by the transaction function. The wrapped function also has access to the `this` context as defined where the transaction is executed.

```ts
const insert = db.prepare("INSERT INTO cats (name) VALUES ($name)");
const insertCats = db.transaction(cats => {
  for (const cat of cats) insert.run(cat);
  return cats.length;
});

const count = insertCats([
  { $name: "Keanu" },
  { $name: "Salem" },
  { $name: "Crookshanks" },
]);

console.log(`Inserted ${count} cats`);
```

The driver will automatically [`begin`](https://www.sqlite.org/lang_transaction.html) a transaction when `insertCats` is called and `commit` it when the wrapped function returns. If an exception is thrown, the transaction will be rolled back. The exception will propagate as usual; it is not caught.

{% callout %}
**Nested transactions** — Transaction functions can be called from inside other transaction functions. When doing so, the inner transaction becomes a [savepoint](https://www.sqlite.org/lang_savepoint.html).

{% details summary="View nested transaction example" %}

```ts
// setup
import { Database } from "bun:sqlite";
const db = Database.open(":memory:");
db.run(
  "CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, note TEXT, dollars INTEGER);",
);
db.run(
  "CREATE TABLE cats (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, age INTEGER)",
);
const insertExpense = db.prepare(
  "INSERT INTO expenses (note, dollars) VALUES (?, ?)",
);
const insert = db.prepare("INSERT INTO cats (name, age) VALUES ($name, $age)");
const insertCats = db.transaction(cats => {
  for (const cat of cats) insert.run(cat);
});

const adopt = db.transaction(cats => {
  insertExpense.run("adoption fees", 20);
  insertCats(cats); // nested transaction
});

adopt([
  { $name: "Joey", $age: 2 },
  { $name: "Sally", $age: 4 },
  { $name: "Junior", $age: 1 },
]);
```

{% /details %}
{% /callout %}

Transactions also come with `deferred`, `immediate`, and `exclusive` versions.

```ts
insertCats(cats); // uses "BEGIN"
insertCats.deferred(cats); // uses "BEGIN DEFERRED"
insertCats.immediate(cats); // uses "BEGIN IMMEDIATE"
insertCats.exclusive(cats); // uses "BEGIN EXCLUSIVE"
```

### `.loadExtension()`

To load a [SQLite extension](https://www.sqlite.org/loadext.html), call `.loadExtension(name)` on your `Database` instance

```ts
import { Database } from "bun:sqlite";

const db = new Database();
db.loadExtension("myext");
```

{% details summary="For macOS users" %}
**MacOS users** By default, macOS ships with Apple's proprietary build of SQLite, which doesn't support extensions. To use extensions, you'll need to install a vanilla build of SQLite.

```bash
$ brew install sqlite
$ which sqlite # get path to binary
```

To point `bun:sqlite` to the new build, call `Database.setCustomSQLite(path)` before creating any `Database` instances. (On other operating systems, this is a no-op.) Pass a path to the SQLite `.dylib` file, _not_ the executable. With recent versions of Homebrew this is something like `/opt/homebrew/Cellar/sqlite/<version>/libsqlite3.dylib`.

```ts
import { Database } from "bun:sqlite";

Database.setCustomSQLite("/path/to/libsqlite.dylib");

const db = new Database();
db.loadExtension("myext");
```

{% /details %}

### .fileControl(cmd: number, value: any)

To use the advanced `sqlite3_file_control` API, call `.fileControl(cmd, value)` on your `Database` instance.

```ts
import { Database, constants } from "bun:sqlite";

const db = new Database();
// Ensure WAL mode is NOT persistent
// this prevents wal files from lingering after the database is closed
db.fileControl(constants.SQLITE_FCNTL_PERSIST_WAL, 0);
```

`value` can be:

- `number`
- `TypedArray`
- `undefined` or `null`

## Reference

```ts
class Database {
  constructor(
    filename: string,
    options?:
      | number
      | {
          readonly?: boolean;
          create?: boolean;
          readwrite?: boolean;
        },
  );

  query<Params, ReturnType>(sql: string): Statement<Params, ReturnType>;
  run(
    sql: string,
    params?: SQLQueryBindings,
  ): { lastInsertRowid: number; changes: number };
  exec = this.run;
}

class Statement<Params, ReturnType> {
  all(params: Params): ReturnType[];
  get(params: Params): ReturnType | undefined;
  run(params: Params): {
    lastInsertRowid: number;
    changes: number;
  };
  values(params: Params): unknown[][];

  finalize(): void; // destroy statement and clean up resources
  toString(): string; // serialize to SQL

  columnNames: string[]; // the column names of the result set
  paramsCount: number; // the number of parameters expected by the statement
  native: any; // the native object representing the statement

  as(Class: new () => ReturnType): this;
}

type SQLQueryBindings =
  | string
  | bigint
  | TypedArray
  | number
  | boolean
  | null
  | Record<string, string | bigint | TypedArray | number | boolean | null>;
```

### Datatypes

| JavaScript type | SQLite type            |
| --------------- | ---------------------- |
| `string`        | `TEXT`                 |
| `number`        | `INTEGER` or `DECIMAL` |
| `boolean`       | `INTEGER` (1 or 0)     |
| `Uint8Array`    | `BLOB`                 |
| `Buffer`        | `BLOB`                 |
| `bigint`        | `INTEGER`              |
| `null`          | `NULL`                 |

Bun provides native APIs for working with HTTP cookies through `Bun.Cookie` and `Bun.CookieMap`. These APIs offer fast, easy-to-use methods for parsing, generating, and manipulating cookies in HTTP requests and responses.

## CookieMap class

`Bun.CookieMap` provides a Map-like interface for working with collections of cookies. It implements the `Iterable` interface, allowing you to use it with `for...of` loops and other iteration methods.

```ts
// Empty cookie map
const cookies = new Bun.CookieMap();

// From a cookie string
const cookies1 = new Bun.CookieMap("name=value; foo=bar");

// From an object
const cookies2 = new Bun.CookieMap({
  session: "abc123",
  theme: "dark",
});

// From an array of name/value pairs
const cookies3 = new Bun.CookieMap([
  ["session", "abc123"],
  ["theme", "dark"],
]);
```

### In HTTP servers

In Bun's HTTP server, the `cookies` property on the request object (in `routes`) is an instance of `CookieMap`:

```ts
const server = Bun.serve({
  routes: {
    "/": req => {
      // Access request cookies
      const cookies = req.cookies;

      // Get a specific cookie
      const sessionCookie = cookies.get("session");
      if (sessionCookie != null) {
        console.log(sessionCookie);
      }

      // Check if a cookie exists
      if (cookies.has("theme")) {
        // ...
      }

      // Set a cookie, it will be automatically applied to the response
      cookies.set("visited", "true");

      return new Response("Hello");
    },
  },
});

console.log("Server listening at: " + server.url);
```

### Methods

#### `get(name: string): string | null`

Retrieves a cookie by name. Returns `null` if the cookie doesn't exist.

```ts
// Get by name
const cookie = cookies.get("session");

if (cookie != null) {
  console.log(cookie);
}
```

#### `has(name: string): boolean`

Checks if a cookie with the given name exists.

```ts
// Check if cookie exists
if (cookies.has("session")) {
  // Cookie exists
}
```

#### `set(name: string, value: string): void`

#### `set(options: CookieInit): void`

#### `set(cookie: Cookie): void`

Adds or updates a cookie in the map. Cookies default to `{ path: "/", sameSite: "lax" }`.

```ts
// Set by name and value
cookies.set("session", "abc123");

// Set using options object
cookies.set({
  name: "theme",
  value: "dark",
  maxAge: 3600,
  secure: true,
});

// Set using Cookie instance
const cookie = new Bun.Cookie("visited", "true");
cookies.set(cookie);
```

#### `delete(name: string): void`

#### `delete(options: CookieStoreDeleteOptions): void`

Removes a cookie from the map. When applied to a Response, this adds a cookie with an empty string value and an expiry date in the past. A cookie will only delete successfully on the browser if the domain and path is the same as it was when the cookie was created.

```ts
// Delete by name using default domain and path.
cookies.delete("session");

// Delete with domain/path options.
cookies.delete({
  name: "session",
  domain: "example.com",
  path: "/admin",
});
```

#### `toJSON(): Record<string, string>`

Converts the cookie map to a serializable format.

```ts
const json = cookies.toJSON();
```

#### `toSetCookieHeaders(): string[]`

Returns an array of values for Set-Cookie headers that can be used to apply all cookie changes.

When using `Bun.serve()`, you don't need to call this method explicitly. Any changes made to the `req.cookies` map are automatically applied to the response headers. This method is primarily useful when working with other HTTP server implementations.

```js
import { createServer } from "node:http";
import { CookieMap } from "bun";

const server = createServer((req, res) => {
  const cookieHeader = req.headers.cookie || "";
  const cookies = new CookieMap(cookieHeader);

  cookies.set("view-count", Number(cookies.get("view-count") || "0") + 1);
  cookies.delete("session");

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Set-Cookie": cookies.toSetCookieHeaders(),
  });
  res.end(`Found ${cookies.size} cookies`);
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
```

### Iteration

`CookieMap` provides several methods for iteration:

```ts
// Iterate over [name, cookie] entries
for (const [name, value] of cookies) {
  console.log(`${name}: ${value}`);
}

// Using entries()
for (const [name, value] of cookies.entries()) {
  console.log(`${name}: ${value}`);
}

// Using keys()
for (const name of cookies.keys()) {
  console.log(name);
}

// Using values()
for (const value of cookies.values()) {
  console.log(value);
}

// Using forEach
cookies.forEach((value, name) => {
  console.log(`${name}: ${value}`);
});
```

### Properties

#### `size: number`

Returns the number of cookies in the map.

```ts
console.log(cookies.size); // Number of cookies
```

## Cookie class

`Bun.Cookie` represents an HTTP cookie with its name, value, and attributes.

```ts
import { Cookie } from "bun";

// Create a basic cookie
const cookie = new Bun.Cookie("name", "value");

// Create a cookie with options
const secureSessionCookie = new Bun.Cookie("session", "abc123", {
  domain: "example.com",
  path: "/admin",
  expires: new Date(Date.now() + 86400000), // 1 day
  httpOnly: true,
  secure: true,
  sameSite: "strict",
});

// Parse from a cookie string
const parsedCookie = new Bun.Cookie("name=value; Path=/; HttpOnly");

// Create from an options object
const objCookie = new Bun.Cookie({
  name: "theme",
  value: "dark",
  maxAge: 3600,
  secure: true,
});
```

### Constructors

```ts
// Basic constructor with name/value
new Bun.Cookie(name: string, value: string);

// Constructor with name, value, and options
new Bun.Cookie(name: string, value: string, options: CookieInit);

// Constructor from cookie string
new Bun.Cookie(cookieString: string);

// Constructor from cookie object
new Bun.Cookie(options: CookieInit);
```

### Properties

```ts
cookie.name; // string - Cookie name
cookie.value; // string - Cookie value
cookie.domain; // string | null - Domain scope (null if not specified)
cookie.path; // string - URL path scope (defaults to "/")
cookie.expires; // number | undefined - Expiration timestamp (ms since epoch)
cookie.secure; // boolean - Require HTTPS
cookie.sameSite; // "strict" | "lax" | "none" - SameSite setting
cookie.partitioned; // boolean - Whether the cookie is partitioned (CHIPS)
cookie.maxAge; // number | undefined - Max age in seconds
cookie.httpOnly; // boolean - Accessible only via HTTP (not JavaScript)
```

### Methods

#### `isExpired(): boolean`

Checks if the cookie has expired.

```ts
// Expired cookie (Date in the past)
const expiredCookie = new Bun.Cookie("name", "value", {
  expires: new Date(Date.now() - 1000),
});
console.log(expiredCookie.isExpired()); // true

// Valid cookie (Using maxAge instead of expires)
const validCookie = new Bun.Cookie("name", "value", {
  maxAge: 3600, // 1 hour in seconds
});
console.log(validCookie.isExpired()); // false

// Session cookie (no expiration)
const sessionCookie = new Bun.Cookie("name", "value");
console.log(sessionCookie.isExpired()); // false
```

#### `serialize(): string`

#### `toString(): string`

Returns a string representation of the cookie suitable for a `Set-Cookie` header.

```ts
const cookie = new Bun.Cookie("session", "abc123", {
  domain: "example.com",
  path: "/admin",
  expires: new Date(Date.now() + 86400000),
  secure: true,
  httpOnly: true,
  sameSite: "strict",
});

console.log(cookie.serialize());
// => "session=abc123; Domain=example.com; Path=/admin; Expires=Sun, 19 Mar 2025 15:03:26 GMT; Secure; HttpOnly; SameSite=strict"
console.log(cookie.toString());
// => "session=abc123; Domain=example.com; Path=/admin; Expires=Sun, 19 Mar 2025 15:03:26 GMT; Secure; HttpOnly; SameSite=strict"
```

#### `toJSON(): CookieInit`

Converts the cookie to a plain object suitable for JSON serialization.

```ts
const cookie = new Bun.Cookie("session", "abc123", {
  secure: true,
  httpOnly: true,
});

const json = cookie.toJSON();
// => {
//   name: "session",
//   value: "abc123",
//   path: "/",
//   secure: true,
//   httpOnly: true,
//   sameSite: "lax",
//   partitioned: false
// }

// Works with JSON.stringify
const jsonString = JSON.stringify(cookie);
```

### Static methods

#### `Cookie.parse(cookieString: string): Cookie`

Parses a cookie string into a `Cookie` instance.

```ts
const cookie = Bun.Cookie.parse("name=value; Path=/; Secure; SameSite=Lax");

console.log(cookie.name); // "name"
console.log(cookie.value); // "value"
console.log(cookie.path); // "/"
console.log(cookie.secure); // true
console.log(cookie.sameSite); // "lax"
```

#### `Cookie.from(name: string, value: string, options?: CookieInit): Cookie`

Factory method to create a cookie.

```ts
const cookie = Bun.Cookie.from("session", "abc123", {
  httpOnly: true,
  secure: true,
  maxAge: 3600,
});
```

## Types

```ts
interface CookieInit {
  name?: string;
  value?: string;
  domain?: string;
  /** Defaults to '/'. To allow the browser to set the path, use an empty string. */
  path?: string;
  expires?: number | Date | string;
  secure?: boolean;
  /** Defaults to `lax`. */
  sameSite?: CookieSameSite;
  httpOnly?: boolean;
  partitioned?: boolean;
  maxAge?: number;
}

interface CookieStoreDeleteOptions {
  name: string;
  domain?: string | null;
  path?: string;
}

interface CookieStoreGetOptions {
  name?: string;
  url?: string;
}

type CookieSameSite = "strict" | "lax" | "none";

class Cookie {
  constructor(name: string, value: string, options?: CookieInit);
  constructor(cookieString: string);
  constructor(cookieObject?: CookieInit);

  readonly name: string;
  value: string;
  domain?: string;
  path: string;
  expires?: Date;
  secure: boolean;
  sameSite: CookieSameSite;
  partitioned: boolean;
  maxAge?: number;
  httpOnly: boolean;

  isExpired(): boolean;

  serialize(): string;
  toString(): string;
  toJSON(): CookieInit;

  static parse(cookieString: string): Cookie;
  static from(name: string, value: string, options?: CookieInit): Cookie;
}

class CookieMap implements Iterable<[string, string]> {
  constructor(init?: string[][] | Record<string, string> | string);

  get(name: string): string | null;

  toSetCookieHeaders(): string[];

  has(name: string): boolean;
  set(name: string, value: string, options?: CookieInit): void;
  set(options: CookieInit): void;
  delete(name: string): void;
  delete(options: CookieStoreDeleteOptions): void;
  delete(name: string, options: Omit<CookieStoreDeleteOptions, "name">): void;
  toJSON(): Record<string, string>;

  readonly size: number;

  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  forEach(callback: (value: string, key: string, map: CookieMap) => void): void;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}
```
