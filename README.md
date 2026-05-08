# Harper-Apollo Application Template

This is a template for building and using Apollo applications in [Harper](https://www.harper.fast/). You can download this repository as a starting point for building Apollo applications with Harper. To get started, make sure you have [installed Harper](https://docs.Harper.io/docs/install-Harper), which can be quickly done with `npm install -g harper`. You can run your application from the directory where you downloaded the contents of this repository with:

`harper dev /path/to/apollo-example`

(or if you enter that directory, you can run the current directory as `harper dev .`).

The [schema.graphql](./schema.graphql) is the schema definition. This is the main starting point for defining your database schema and Apollo endpoints, specifying which tables you want and what attributes/fields they should have, and which queries can be made with Apollo.

The [resolvers.js](./resolvers.js) provides a template for defining Apollo resolvers.

#### NOTE: If you want to connect to the Apollo sandbox you will need to turn on CORS in Harper like the following:
```yaml
http:
  cors: true
  corsAccessList:
    - "*"
```
