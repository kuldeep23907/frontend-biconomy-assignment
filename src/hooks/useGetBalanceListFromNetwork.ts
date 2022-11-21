import { useEffect, useState, useCallback } from 'react';
import {
  useAccount,
  useNetwork,
  useContract,
  useSigner,
} from 'wagmi';
import { ethers, ContractInterface } from 'ethers';
import { token as tokenConfig } from '../utils';

/**
 * Fetch quote hook to be updated on connecting supported networks
 */
const useGetBalanceListFromNetwork = (
  contractAddress: string,
  abi: any
) => {
  const { data: signer } = useSigner();
  const { chain } = useNetwork();
  const { address } = useAccount();

  const tokenList = [
    '0x0000000000000000000000000000000000000000',
    '0xb4e5CEE8Dc21c80Aa015943D71A025de17100bEa',
    '0x943d4eAF800790d97C2f2fA28A56D72B49c09706',
  ];

  const [isClaimBalance, setIsClaimBalance] = useState(false);
  const [balanceList, setBalanceList] = useState<any>([]);

  const contract = useContract({
    addressOrName: contractAddress,
    contractInterface: abi,
    signerOrProvider: signer,
  });

  function timeConverter(timestamp: any) {
    var a = new Date(timestamp * 1000);
    var months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time =
      date +
      ' ' +
      month +
      ' ' +
      year +
      ' ' +
      hour +
      ':' +
      min +
      ':' +
      sec;
    return time;
  }

  const fetchBalanceList = useCallback(
    async (receiver: any, tokens: string[] = []) => {
      try {
        setIsClaimBalance(true);
        setBalanceList([]);

        console.log(address);
        console.log(receiver);
        console.log(tokens);

        let latestRes: any = [];
        await Promise.all(
          tokens.map(async (token) => {
            let tokenName;
            let tokenSymbol;
            let tokenBalance;
            if (
              token ===
                '0x0000000000000000000000000000000000000000' &&
              address
            ) {
              const ethersProvider =
                new ethers.providers.Web3Provider(
                  window.ethereum as any
                );
              tokenName = 'Ether';
              tokenSymbol = 'ETH';
              tokenBalance = await ethersProvider.getBalance(address);
            } else {
              const tokenInstance = new ethers.Contract(
                token,
                tokenConfig.contract.abi as ContractInterface,
                signer!
              );
              console.log('tokenInstance', tokenInstance);
              tokenName = await tokenInstance.name();
              tokenSymbol = await tokenInstance.symbol();
              tokenBalance = await tokenInstance.balanceOf(address);
            }

            const res = await contract.getLockedTokenDetails(
              receiver,
              token
            );
            console.log('res', res);

            const withdrawTime = res.depositTimestamp.add(
              res.lockPeriod
            );

            console.log('withdrawTime', timeConverter(withdrawTime));
            latestRes.push({
              token: token,
              name: tokenName,
              symbol: tokenSymbol,
              balance: tokenBalance,
              amount: res.amount,
              time: timeConverter(withdrawTime),
            });
          })
        );
        setBalanceList([
          // with a new array
          ...balanceList, // that contains all the old items
          ...latestRes, // and one new item at the end
        ]);
        setIsClaimBalance(false);
      } catch (err: any) {
        console.error(err);
        setIsClaimBalance(false);
      }
    },
    [contract]
  );

  useEffect(() => {
    if (chain && !chain.unsupported && signer)
      fetchBalanceList(address, tokenList);
  }, [chain, signer, contract, fetchBalanceList]);

  return { tokenList, fetchBalanceList, balanceList, isClaimBalance };
};

export default useGetBalanceListFromNetwork;
