export const HOURLY_PAIR_RATES = (pairAddress, blocks) => {
    let queryString = 'query blocks {'
    queryString += blocks.map(
        (block) => `
      t${block.timestamp}: pair(id:"${pairAddress}", block: { number: ${block.number} }) { 
        token0Price
        token1Price
      }
    `
    )

    queryString += '}'
    return gql(queryString)
}


HOURLY_PAIR_RATES(0xa478c2975ab1ea89e8196811f51a7b7ade33eb11)
