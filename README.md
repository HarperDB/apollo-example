# HarperDB-Apollo Application Template

This is a template for building and using Apollo applications in [HarperDB](https://www.harperdb.io/). You can download this repository as a starting point for building Apollo applications with HarperDB. To get started, make sure you have [installed HarperDB](https://docs.harperdb.io/docs/install-harperdb), which can be quickly done with `npm install -g harperdb`. You can run your application from the directory where you downloaded the contents of this repository with:

`harperdb dev /path/to/apollo-example`

(or if you enter that directory, you can run the current directory as `harperdb dev .`).

The [schema.graphql](./schema.graphql) is the schema definition. This is the main starting point for defining your database schema and Apollo endpoints, specifying which tables you want and what attributes/fields they should have, and which queries can be made with Apollo.

The [resolvers.js](./resolvers.js) provides a template for defining Apollo resolvers.

#### NOTE: If you want to connect to the Apollo sandbox you will need to turn on CORS in HarperDB like the following:
```yaml
http:
  cors: true
  corsAccessList:
    - "*"
```