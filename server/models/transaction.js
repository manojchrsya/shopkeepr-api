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
    const data = {};
    const invoiceData = await Transaction.findOneById(customerId, { include: 'transactions' });
    const paymentDetails = invoiceData.payments() || [];
    data.totalPaidAmount = paymentDetails.length > 0 ? parseNumber(_.sumBy(paymentDetails, 'amount')) : 0;
    data.outStandingAmount = parseNumber(data.invoiceAmount - data.totalPaidAmount);
    return data;
  };
};
