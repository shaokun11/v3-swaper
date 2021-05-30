const { ethers } = require("ethers");
const BN = require("bignumber.js");
const NFTManagerAbi = require("./abi_nft_manager.json");
const SwapAbi = require("./abi_swap.json");
const QuoterAbi = require("./abi_quoter.json");

const infura_url = "https://rinkeby.infura.io/v3";
const provider = new ethers.providers.JsonRpcProvider(infura_url);
const wallet = new ethers.Wallet("");
const swapRouterAddr = "0xe592427a0aece92de3edee1f18e0157c05861564";
const signer = wallet.connect(provider);
const NFTMangerAddr = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const NFTMangerContract = new ethers.Contract(
  NFTMangerAddr,
  NFTManagerAbi,
  signer
);
const quoterAddr = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const SwapContract = new ethers.Contract(swapRouterAddr, SwapAbi, signer);
const QuoterContract = new ethers.Contract(quoterAddr, QuoterAbi, signer);
const weth9 = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
const dai = "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735";
const meAddress = "0xAC08b6BaeE2cF21C02f32c4A000a10FF814186F2";

const deadline = 1653826640;
// 实际price与链上储存的sqrtPrice的转换定值
const FIXED_192 = BN(2).pow(96).pow(2);
//  手续费与对应的tick space
const FEES = {
  500: 10,
  3000: 60,
  10000: 200,
};

function getTickIndex(p) {
  return (Math.log(p) / Math.log(1.0001)) | 0;
}
function getToken1Amount(
  _low = 240240,
  _up = 320090,
  _curr = 294004,
  amount = 1e12
) {
  const upper = FIXED_192.multipliedBy(_up).sqrt();
  const current = FIXED_192.multipliedBy(_curr).sqrt();
  const low = FIXED_192.multipliedBy(_low).sqrt(); // 根据price转换成sqrt price
  // 先获取lp 然后根据lp查询具体需要的token2的数量
  return BN(
    upper
      .multipliedBy(current)
      .div(upper.minus(current))
      .multipliedBy(amount)
      .toFixed()
  )
    .multipliedBy(current.minus(low))
    .div(FIXED_192)
    .div(1e18)
    .toFixed(18);
}

const newPosition = (price, fee, span = 1) => {
  // mint ,add类似
  const tickIndex = getTickIndex(price);
  const tickLower = tickIndex - (tickIndex % FEES[fee]);
  const tickUpper = tickLower + FEES[fee] * span;
  NFTMangerContract.mint(
    {
      token0: weth9,
      token1: dai,
      fee: fee,
      tickLower: tickLower,
      tickUpper: tickUpper,
      amount0Desired: ethers.utils.parseEther("0.000001"),
      amount1Desired: ethers.utils.parseEther("0.678576"),
      amount0Min: 0,
      amount1Min: 0,
      recipient: meAddress,
      deadline,
    },
    {
      gasLimit: 1e6,
      value: ethers.utils.parseEther("0.000001"),
    }
  )
    .then(console.log)
    .catch(console.error);
};
// 1 价格区间小于当前的价格,则只能提供token0
// 2 如果在区间中,则需要每种都要按比例提供,amount1可以通过getAmount1得到
// 3 如果大于当前的价格区间,则只能够卖,即只能提供token1
// newPosition(240240, 500, 287);

// 获取 721的具体信息,移除的时候需要提供lp的数量
function positionInfo(tokenID) {
  NFTMangerContract.positions(tokenID).then(console.log);
}

const removeLP = () => {
  // lp通过 positionInfo 获取
  NFTMangerContract.decreaseLiquidity(
    {
      tokenId: 985,
      liquidity: "13028755680205421",
      amount0Min: 0,
      amount1Min: 0,
      deadline,
    },
    {
      gasLimit: 1e6,
    }
  )
    .then(console.log)
    .catch(console.error);
};

const collectRewards = () => {
  // 领取收益
  NFTMangerContract.collect({
    tokenId: 985,
    recipient: meAddress,
    amount0Max: ethers.utils.parseEther("1111111111111111"),
    amount1Max: ethers.utils.parseEther("1111111111111111"),
  })
    .then(console.log)
    .catch(console.error);
};

const swapExactInput = () => {
  SwapContract.exactInputSingle({
    tokenIn: weth9,
    tokenOut: dai,
    fee: 10000,
    recipient: meAddress,
    deadline,
    amountIn: ethers.utils.parseEther("0.00001"),
    amountOutMinimum: 1, // 忽略输出,如果需要可以根据滑点来算,一般是不需要的
    sqrtPriceLimitX96: 0, // 指定成交的价格限制
  })
    .then(console.log)
    .catch(console.error);
};

const swapExactOutput = () => {
  // 指定输出数量 兑换一个 dai
  QuoterContract.callStatic
    .quoteExactOutputSingle(weth9, dai, 3000, ethers.utils.parseEther("1"), 0)
    .then((res) => {
      console.log("---qutor---", res.toString()); // 获取至少输入的inAmount
      return SwapContract.exactOutputSingle({
        tokenIn: weth9,
        tokenOut: dai,
        fee: 3000,
        recipient: meAddress,
        deadline,
        amountOut: ethers.utils.parseEther("1"), // 交易数量
        amountInMaximum: res,
        sqrtPriceLimitX96: 0, // 默认价格最新价格
      });
    })
    .then((res) => {
      console.log("----swap2----", res);
    });
};

function parseInputData(data) {
  let str =
    "0xdb3e2198000000000000000000000000c778417e063141139fce010982780140aa0cd5ab000000000000000000000000c7ad46e0b8a400bb3c915120d284aafba8fc47350000000000000000000000000000000000000000000000000000000000000bb8000000000000000000000000ac08b6baee2cf21c02f32c4a000a10ff814186f20000000000000000000000000000000000000000000000000000000060b360a50000000000000000000000000000000000000000000000008ac7230489e8000000000000000000000000000000000000000000000000000000001ef6db07ff1d0000000000000000000000000000000000000000000000000000000000000000";
  str = str.slice(10);
  let ii = 0;
  while (str) {
    console.log(ii++ + "----", str.slice(0, 64));
    str = str.slice(64);
  }
}
function getSqrtPrice(p = "294004.38870192448916160673") {
  return FIXED_192.multipliedBy(p).sqrt().toFixed(0);
}

function getWebPrice(p = "42959230190171593091687281297335") {
  return BN(p).pow(2).div(FIXED_192).toString();
}
