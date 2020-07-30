const _ = require('lodash');

module.exports = function (Transaction) {
  Transaction.TYPE_CREDIT = 'CREDIT';
  Transaction.TYPE_DEBIT = 'DEBIT';
  Transaction.VALID_TYPES = [Transaction.TYPE_CREDIT, Transaction.TYPE_DEBIT];

  Transaction.setup = function () {
    const TransactionModel = this;
    TransactionModel.validatesInclusionOf('type', { in: Transaction.VALID_TYPES });
    TransactionModel.validatesNumericalityOf('amount', { message: 'amount is not valid' });

    return TransactionModel;
  };
  Transaction.setup();

  Transaction.getDetails = async function (options) {
    const { customerId } = options;
    const collection = await Transaction.getDBConnection();
    let transactionDetail = await collection.aggregate([
      { $match: { customerId } },
      { $group: { _id: { customerId: '$customerId', type: '$type' }, total: { $sum: '$amount' } } },
      { $project: { _id: 0, customerId: '$_id.customerId', type: '$_id.type', total: '$total' } },
    ]).toArray();
    transactionDetail = _.groupBy(transactionDetail, 'type');
    const credit = _.first(transactionDetail['CREDIT']) || { total: 0 };
    const debit = _.first(transactionDetail['DEBIT']) || { total: 0 };
    const total = parseNumber((credit.total || 0) + (debit.total || 0));
    let dueAmount = 0;
    let advanceAmount = 0;
    if (credit.total > debit.total) advanceAmount = parseNumber(credit.total - debit.total);
    if (debit.total > credit.total) dueAmount = parseNumber(debit.total - credit.total);
    return { credit, debit, dueAmount, advanceAmount, total }
  };
};
