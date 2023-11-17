/** Here we can define Apollo resolvers */
const resolvers = {
	Query: {
		tableName: (parent, args, context, info) => {
			return tables.TableName.get(args.id);
		},
	},
};

export default resolvers;
