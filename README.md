## swap V3 simple comm api
> 参考v3合约,sdk,interface整理了一下v3相关合约的调用,填入填入自己的密匙和infura密匙即可使用啦

#### 支持方法
- newPosition       提供区间段流动性,区间可以根据需求定义
- getTickIndex      根据价格获取 tick index
- positionInfo      根据 tokenId 查询这个 position 的所有数据
- removeLP          根据 tokenID 移除流动性,可部分移除,
- collectRewards    领取提供 LP 的奖励收益(提供的 position 有 price 到达过才会有)
- swapExactInput    指定一定量的 token 兑换其他 token
- swapExactOutput   兑换确定的 token
- getSqrtPrice      获取合约中需要的参数 sqrtPriceX96 数据类型
- getWebPrice       合约中的 sqrtPriceX96 转换成实际的 price
