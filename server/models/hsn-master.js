module.exports = function (HsnMaster) {
  HsnMaster.TAX_CODE_MAPPING = [
    { totalTaxPercentage: 5, sapTaxCode: 22 },
    { totalTaxPercentage: 12, sapTaxCode: 23 },
    { totalTaxPercentage: 18, sapTaxCode: 24 },
    { totalTaxPercentage: 28, sapTaxCode: 25 },
  ];

  HsnMaster.getTaxPercentage = async function () {
    const collection = await HsnMaster.getDBConnection();
    return collection.aggregate([{
      $group: {
        _id: {
          cgst: '$cgst',
          sgst: '$sgst',
        },
      },
    },
    {
      $project: {
        totalTaxPercentage: {
          $add: ['$_id.sgst', '$_id.cgst'],
        },
      },
    }, {
      $sort: {
        score: {
          $meta: 'textScore',
        },
        totalTaxPercentage: 1,
      },
    },
    ]).toArray();
  };
};
