const _ = require('lodash');
const moment = require('moment');

module.exports = function (Transaction) {
  Transaction.TYPE_CREDIT = 'CREDIT';
  Transaction.TYPE_DEBIT = 'DEBIT';
  Transaction.TYPE_SETTLED = 'SETTLED';
  Transaction.VALID_TYPES = [Transaction.TYPE_CREDIT, Transaction.TYPE_DEBIT, Transaction.TYPE_SETTLED];

  Transaction.setup = function () {
    const TransactionModel = this;
    TransactionModel.validatesInclusionOf('type', { in: Transaction.VALID_TYPES });
    TransactionModel.validatesNumericalityOf('amount', { message: 'amount is not valid' });

    return TransactionModel;
  };
  Transaction.setup();

  Transaction.getDetails = async function (options) {
    const [transactionColl, invoiceColl] = await Promise.all([
      Transaction.getDBConnection(),
      Invoice.getDBConnection(),
    ]);
    const query = Transaction.generateQuery(options);
    // eslint-disable-next-line prefer-const
    let [transactionDetail, invoiceDetail] = await Promise.all([
      transactionColl.aggregate(query).toArray(),
      invoiceColl.aggregate(query).toArray(),
    ]);
    const results = [];
    const groupId = options.type === Customer.modelName ? 'customerId' : 'shopKeeperId';
    const customerTxns = _.groupBy(transactionDetail, groupId);
    const customerInvoices = _.groupBy(invoiceDetail, groupId);
    _.keys(customerTxns).forEach((data) => {
      const txnDetail = _.groupBy(customerTxns[data], 'type');
      let revenue = { total: 0 };
      if (customerInvoices[data]) {
        revenue = _.first(customerInvoices[data]);
      }
      const credit = _.first(txnDetail.CREDIT) || { total: 0 };
      const debit = _.first(txnDetail.DEBIT) || { total: 0 };
      const settled = _.first(txnDetail.SETTLED) || { total: 0 };
      const total = parseNumber((credit.total || 0) + (debit.total || 0) + (settled.total || 0));
      let dueAmount = 0;
      let advanceAmount = 0;
      if (credit.total > debit.total) advanceAmount = parseNumber(credit.total - debit.total);
      if (debit.total > credit.total) dueAmount = parseNumber(debit.total - credit.total);
      const details = {};
      details[groupId] = data;
      results.push({
        ...details, credit, debit, dueAmount, advanceAmount, total, revenue,
      });
    });
    return results;
  };

  Transaction.generateQuery = function (options) {
    const {
      customerIds,
      shopKeeperId,
      startDate,
      endDate,
    } = options;
    const query = [];
    if (customerIds && customerIds.length > 0) {
      query.push({ $match: { customerId: { $in: customerIds } } });
      query.push({ $group: { _id: { customerId: '$customerId', type: '$type' }, total: { $sum: '$amount' } } });
      // eslint-disable-next-line object-curly-newline
      query.push({ $project: { _id: 0, customerId: '$_id.customerId', type: '$_id.type', total: '$total' } });
    } else if (shopKeeperId) {
      const matchQuery = { $match: { shopKeeperId } };
      if (startDate && endDate) {
        matchQuery.$match.createdOn = { $gte: new Date(startDate), $lt: new Date(endDate) };
      }
      query.push(matchQuery);
      query.push({ $group: { _id: { shopKeeperId: '$shopKeeperId', type: '$type' }, total: { $sum: '$amount' } } });
      // eslint-disable-next-line object-curly-newline
      query.push({ $project: { _id: 0, shopKeeperId: '$_id.shopKeeperId', type: '$_id.type', total: '$total' } });
    }
    return query;
  };

  Transaction.getLastWeekDetails = async function (options) {
    const { shopKeeperId } = options;
    const startDate = moment().subtract(7, 'days');
    const endDate = moment().add(1, 'days').format('YYYY-MM-DD');
    const collection = await Transaction.getDBConnection();
    const query = [];
    query.push({ $match: { shopKeeperId, createdOn: { $gte: new Date(startDate), $lt: new Date(endDate) } } });
    query.push({
      $group: {
        _id: {
          shopKeeperId: '$shopKeeperId',
          type: '$type',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
        },
        total: { $sum: '$amount' },
      },
    });
    query.push({
      $project: {
        _id: 0,
        shopKeeperId: '$_id.shopKeeperId',
        type: '$_id.type',
        total: '$total',
        date: '$_id.date',
      },
    });
    return collection.aggregate(query).toArray();
  };
};
