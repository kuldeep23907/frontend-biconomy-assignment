import React, { useState, useEffect } from 'react';
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  formatMs,
} from '@material-ui/core';
import { Link, Backdrop, makeStyles } from '@material-ui/core';
import { ethers, ContractInterface } from 'ethers';
import { useAccount, useNetwork, useSigner } from 'wagmi';

import { Biconomy } from '@biconomy/mexa';
import useGetBalanceListFromNetwork from '../hooks/useGetBalanceListFromNetwork';
import {
  configCustom_EIP712Sign as config,
  token as tokenConfig,
  getSignatureParametersEthers,
  ExternalProvider,
  showErrorMessage,
  showInfoMessage,
  showSuccessMessage,
} from '../utils';

const domainType = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];
const claimType = [
  { name: 'token', type: 'address' },
  { name: 'amount', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
];

let domainData = {
  name: 'TimeLockedWallet',
  version: '1',
  chainId: '5',
  verifyingContract: config.contract.address,
};

let biconomy: any;

function App() {
  const classes = useStyles();

  console.log(useAccount());
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();

  const [backdropOpen, setBackdropOpen] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState('');
  const [action, setAction] = useState('deposit');
  const [approve, setApprove] = useState(false);
  const [token, setToken] = useState(
    '0x0000000000000000000000000000000000000000'
  );
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [lockPeriod, setLockPeriod] = useState('');

  const [metaTxEnabled] = useState(true);
  const [transactionHash, setTransactionHash] = useState('');

  const { tokenList, fetchBalanceList, balanceList } =
    useGetBalanceListFromNetwork(
      config.contract.address,
      config.contract.abi
    );

  useEffect(() => {
    const initBiconomy = async () => {
      setBackdropOpen(true);
      setLoadingMessage('Biconomy Assignment ...');
      biconomy = new Biconomy(window.ethereum as ExternalProvider, {
        apiKey: config.apiKey.test,
        debug: true,
        contractAddresses: [config.contract.address],
      });
      await biconomy.init();
      setBackdropOpen(false);
    };
    if (address && chain && signer?.provider) initBiconomy();
  }, [address, chain, signer?.provider]);

  const checkAllowanceAndSetAmount = async (e: any) => {
    e.preventDefault();
    setAmount(e.target.value);
    if (token !== '0x0000000000000000000000000000000000000000') {
      const tokenInstance = new ethers.Contract(
        token,
        tokenConfig.contract.abi as ContractInterface,
        signer!
      );
      console.log('tokenInstance', tokenInstance);
      let tokenAmount = await tokenInstance.allowance(
        address,
        config.contract.address
      );

      if (tokenAmount < amount) {
        setApprove(true);
      } else {
        setApprove(false);
      }
    }
  };

  const onApprove = async (e: any) => {
    e.preventDefault();
    setTransactionHash('');
    if (!address) {
      showErrorMessage('Please connect wallet');
      return;
    }
    if (!token) {
      showErrorMessage('Please enter the token');
      return;
    }
    if (!amount) {
      showErrorMessage('Please enter the amount');
      return;
    }
    console.log('Sending normal transaction');

    if (token !== '0x0000000000000000000000000000000000000000') {
      const tokenInstance = new ethers.Contract(
        token,
        tokenConfig.contract.abi as ContractInterface,
        signer!
      );
      console.log('tokenInstance', tokenInstance);
      let tokenAmount = await tokenInstance.allowance(
        address,
        config.contract.address
      );

      if (tokenAmount < amount) {
        let tx = await tokenInstance.approve(
          config.contract.address,
          ethers.utils
            .parseUnits('100000000000000', 'ether')
            .toHexString()
        );
        setTransactionHash(tx.hash);
        tx = await tx.wait(1);
        console.log(tx);
        showSuccessMessage('Tokens approved');
      }
    }
  };

  const onDeposit = async (e: any) => {
    e.preventDefault();
    console.log(balanceList);
    setTransactionHash('');
    if (!address) {
      showErrorMessage('Please connect wallet');
      return;
    }
    if (!token) {
      showErrorMessage('Please enter the token');
      return;
    }
    if (!receiver) {
      showErrorMessage('Please enter the receiver');
      return;
    }
    if (!amount) {
      showErrorMessage('Please enter the amount');
      return;
    }
    if (!lockPeriod) {
      showErrorMessage('Please enter the lock period');
      return;
    }
    console.log('Sending normal transaction');
    const contractInstance = new ethers.Contract(
      config.contract.address,
      config.contract.abi as ContractInterface,
      signer!
    );
    var decimalPlaces = 18;
    var famount = ethers.utils.parseUnits(amount, decimalPlaces);

    console.log('token', token);
    console.log(famount.toString());

    let tx = await contractInstance.deposit(
      receiver,
      token,
      famount,
      lockPeriod,
      {
        from: address,
        value:
          token === '0x0000000000000000000000000000000000000000'
            ? famount
            : 0,
      }
    );
    console.log('tx', tx);
    setTransactionHash(tx.hash);
    tx = await tx.wait(1);
    console.log(tx);
    showSuccessMessage('Transaction confirmed');
    fetchBalanceList(receiver, tokenList);
  };

  const onClaim = async (e: any) => {
    e.preventDefault();
    setTransactionHash('');
    console.log(balanceList);

    if (!address) {
      showErrorMessage('Please connect wallet');
      return;
    }
    if (!token) {
      showErrorMessage('Please enter the token');
      return;
    }
    if (!amount) {
      showErrorMessage('Please enter the amount');
      return;
    }
    if (metaTxEnabled) {
      console.log('Sending meta transaction');
      let userAddress = address;
      // const web3 = new Web3(window.ethereum as any);
      const ethersProvider = new ethers.providers.Web3Provider(
        window.ethereum as any
      );
      const contractInstance = new ethers.Contract(
        config.contract.address,
        config.contract.abi as ContractInterface,
        signer!
      );
      let nonce = await contractInstance.getNonce(userAddress);
      var decimalPlaces = 18;
      var famount =
        token === '0x0000000000000000000000000000000000000000'
          ? amount
          : ethers.utils.parseUnits(amount, decimalPlaces);
      console.log(famount.toString());

      let message = {
        token: token,
        amount: famount.toString(),
        nonce: parseInt(nonce),
      };

      const dataToSign = JSON.stringify({
        types: {
          EIP712Domain: domainType,
          Claim: claimType,
        },
        domain: domainData,
        primaryType: 'Claim',
        message: message,
      });

      // Its important to use eth_signTypedData_v3 and not v4 to get EIP712 signature because we have used salt in domain data
      // instead of chainId
      let signature = await ethersProvider.send(
        'eth_signTypedData_v4',
        [userAddress, dataToSign]
      );
      let { r, s, v } = getSignatureParametersEthers(signature);
      console.log('r', r);
      console.log('s', s);
      console.log('v', v);
      sendSignedTransaction(
        address,
        token,
        famount.toString(),
        r,
        s,
        v
      );
    }
  };

  const sendSignedTransaction = async (
    receiver: string,
    token: string,
    amount: string,
    r: string,
    s: string,
    v: number
  ) => {
    try {
      showInfoMessage(`Sending transaction via Biconomy`);
      const provider = await biconomy.provider;
      const contractInstance = new ethers.Contract(
        config.contract.address,
        config.contract.abi,
        biconomy.ethersProvider
      );
      let { data } = await contractInstance.populateTransaction.claim(
        receiver,
        token,
        amount,
        r,
        s,
        v
      );
      let txParams = {
        data: data,
        to: config.contract.address,
        from: address,
        signatureType: 'EIP712_SIGN',
      };
      const tx = await provider.send('eth_sendTransaction', [
        txParams,
      ]);
      console.log('tx', tx);
      biconomy.on('txHashGenerated', (data: any) => {
        console.log(data);
        showSuccessMessage(`tx hash ${data.hash}`);
        setTransactionHash(data?.hash);
      });
      biconomy.on('txMined', (data: any) => {
        console.log(data);
        showSuccessMessage(`tx mined ${data.hash}`);
        fetchBalanceList(receiver, tokenList);
      });
    } catch (error) {
      console.log('error', error);
      fetchBalanceList(receiver, tokenList);
    }
  };

  return (
    <div className="App">
      <section className="main">
        <div className="flex">
          <p className="mb-author">Token Balance you can deposit</p>
        </div>
        <div>
          {balanceList.map((data: any, index: number) => {
            return (
              <p key={index} style={{ color: 'yellow' }}>
                Asset: {data?.name}
                <br></br>
                Amount{' '}
                {data?.token ===
                '0x0000000000000000000000000000000000000000'
                  ? data?.balance.toString() + ' Wei'
                  : data?.balance
                      .div(ethers.utils.parseEther('1'))
                      .toString() + ' Tokens'}
              </p>
            );
          })}
        </div>
      </section>
      <section className="main">
        <div className="flex">
          <p className="mb-author">Token Balance you can withdraw</p>
        </div>
        <div>
          {balanceList.map((data: any, index: number) => {
            return (
              <p key={index} style={{ color: 'yellow' }}>
                Asset: {data?.name}
                <br></br>
                Amount{' '}
                {data?.token ===
                '0x0000000000000000000000000000000000000000'
                  ? data?.amount.toString() + ' Wei'
                  : data?.amount
                      .div(ethers.utils.parseEther('1'))
                      .toString() + ' Tokens'}
                <br></br>
                You can withdraw after {data?.time}
              </p>
            );
          })}
        </div>
      </section>
      <section>
        {transactionHash !== '' && (
          <Box className={classes.root} mt={2} p={2}>
            <Typography>
              Check your transaction hash{' '}
              <Link
                href={`https://goerli.etherscan.io/tx/${transactionHash}`}
                target="_blank"
                className={classes.link}
              >
                here
              </Link>
            </Typography>
          </Box>
        )}
      </section>
      <section>
        <div className="submit-container">
          <div>
            <select
              name="actions"
              id="actions"
              onChange={(event) => setAction(event.target.value)}
              value={action}
              className="submit-row"
              style={{ height: '35px' }}
            >
              <option key={0} value="deposit">
                Deposit Assets
              </option>
              <option key={1} value="claim">
                Claim Assets
              </option>
            </select>
          </div>
          <div>
            <select
              name="tokens"
              id="tokens"
              onChange={(event) => setToken(event.target.value)}
              value={token}
              className="submit-row"
              style={{ height: '35px' }}
            >
              {balanceList.map((data: any, index: number) => {
                return (
                  <option key={index} value={data?.token}>
                    {data?.name}
                  </option>
                );
              })}
            </select>
          </div>
          {action === 'deposit' && (
            <>
              <div className="submit-row">
                <input
                  type="text"
                  placeholder="Enter Receiver Address"
                  onChange={(event) =>
                    setReceiver(event.target.value)
                  }
                  value={receiver}
                />
              </div>
              <div className="submit-row">
                <input
                  type="text"
                  placeholder="Enter Lock Period in seconds"
                  onChange={(event) =>
                    setLockPeriod(event.target.value)
                  }
                  value={lockPeriod}
                />
              </div>
            </>
          )}

          <div className="submit-row">
            <input
              type="text"
              placeholder="Enter Amount in ether"
              onChange={(event) => checkAllowanceAndSetAmount(event)}
              value={amount}
            />
          </div>

          <div
            className="submit-row"
            style={{ justifyContent: 'center', margin: '10px' }}
          >
            {' '}
            {action === 'deposit' && approve && (
              <Button
                variant="contained"
                color="primary"
                onClick={(event) => {
                  onApprove(event);
                }}
              >
                Approve
              </Button>
            )}
            {action === 'deposit' && (
              <Button
                variant="contained"
                color="primary"
                onClick={(event) => {
                  onDeposit(event);
                }}
              >
                Deposit
              </Button>
            )}
            {action === 'claim' && (
              <Button
                variant="contained"
                color="primary"
                onClick={(event) => {
                  onClaim(event);
                }}
              >
                Claim
              </Button>
            )}
          </div>
        </div>
      </section>
      <Backdrop
        className={classes.backdrop}
        open={backdropOpen}
        onClick={() => setBackdropOpen(false)}
      >
        <CircularProgress color="inherit" />
        <div style={{ paddingLeft: '10px' }}>{loadingMessage}</div>
      </Backdrop>
    </div>
  );
}

export default App;

const useStyles = makeStyles((theme) => ({
  root: {
    '& > * + *': {
      // marginLeft: theme.spacing(0),
    },
  },
  link: {},
  main: {},
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: '#fff',
    opacity: '.85!important',
    background: '#000',
  },
}));
