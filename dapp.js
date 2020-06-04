import patentJson from "./PatentMarket.json";
import auctionJson from "./PatentAuction.json";

const Web3 = require("web3");

const contractAddress = "0xf1bc2f30a21E391C46515D88C08e6caAbbfCdB10"; // insert PatentMarket contract address here

const dApp = {
  ethEnabled: function() {
     // If the browser has an Ethereum provider (MetaMask) installed
	console.log(window.ethereum);
  if (window.ethereum) {
    window.web3 = new Web3(window.ethereum);
    window.ethereum.enable();
    return true;
  }
    return false;
  },
  init: async function() {
    if (!this.ethEnabled()) {
      alert("Please install MetaMask to use this dApp!");
    }
    this.accounts = await window.web3.eth.getAccounts();
    this.contractAddress = contractAddress;
    this.patentContract = new window.web3.eth.Contract(
      patentJson.abi,
      this.contractAddress,
      { defaultAccount: this.accounts[0] }
    );
    this.isAdmin = this.accounts[0] == await this.patentContract.methods.owner().call();
    console.log("Contract object", this.patentContract);
  },
  collectVars: async function() {
    // get Patent tokens
    this.tokens = [];
    this.totalSupply = await this.patentContract.methods.totalSupply().call();
    for (let i = 0; i < this.totalSupply; i++) {
      this.tokens.push({
        tokenId: i,
        highestBid: Number(await this.patentContract.methods.highestBid(i).call()),
        auctionEnded: Boolean(await this.patentContract.methods.auctionEnded(i).call()),
        pendingReturn: Number(await this.patentContract.methods.pendingReturn(i, this.accounts[0]).call()),
        auction: new window.web3.eth.Contract(
          auctionJson.abi,
          await this.patentContract.methods.getAuction(i).call(),
          { defaultAccount: this.accounts[0] }
        ),
        owner: await this.patentContract.methods.ownerOf(i).call(),
        ...JSON.parse(await this.patentContract.methods.tokenURI(i).call())
      });
    }
  },
  setAdmin: async function() {
    // if account selected in MetaMask is the same as owner then admin will show
    if (this.isAdmin) {
      $(".dapp-admin").show();
    } else {
      $(".dapp-admin").hide();
    }
  },
  updateUI: async function() {
    console.log("updating UI");
    // refresh variables
    await this.collectVars();

    $("#dapp-tokens").html("");
    this.tokens.forEach((token) => {
      let endAuction = `<a id="${token.tokenId}" class="dapp-admin" style="display:none;" href="#" onclick="window.dApp.endAuction(event)">End Auction</a>`;
      let bid = `<a id="${token.tokenId}" href="#" onclick="window.dApp.bid(event);">Bid</a>`;
      let owner = `Owner: ${token.owner}`;
      let withdraw = `<a id="${token.tokenId}" href="#" onclick="window.dApp.withdraw(event)">Withdraw</a>`
      let pendingWithdraw = `Balance: ${token.pendingReturn} wei`;
        $("#dapp-tokens").append(
          `<div class="col m6">
            <div class="card">
              <div class="card-image">
                <img id="dapp-image" src="${token.image}">
                <span id="dapp-name" class="card-title">${token.name}</span>
              </div>
              <div class="card-action">
                <input type="number" min="${token.highestBid + 1}" name="dapp-wei" value="${token.highestBid + 1}" ${token.auctionEnded ? 'disabled' : ''}>
                ${token.auctionEnded ? owner : bid}
                ${token.pendingReturn > 0 ? withdraw : ''}
                ${token.pendingReturn > 0 ? pendingWithdraw : ''}
                ${this.isAdmin && !token.auctionEnded ? endAuction : ''}
              </div>
            </div>
          </div>`
        );
    });

    // hide or show admin functions based on contract ownership
    await this.setAdmin();
  },
  bid: async function(event) {
    const tokenId = $(event.target).attr("id");
    const wei = Number($(event.target).prev().val());
    await this.patentContract.methods.bid(tokenId).send({from: this.accounts[0], value: wei}, async () => {
      await this.updateUI();
    });
  },
  endAuction: async function(event) {
    const tokenId = $(event.target).attr("id");
    await this.patentContract.methods.endAuction(tokenId).send({from: this.accounts[0]}, async () => {
      await this.updateUI();
    });
  },
  withdraw: async function(event) {
    const tokenId = $(event.target).attr("id");
    await this.tokens[tokenId].auction.methods.withdraw().send({from: this.accounts[0]}, async () => {
      await this.updateUI();
    });
  },
  registerPatent: async function() {
    const tokenURI = {
      name: $("#dapp-register-name").val(),
      image: $("#dapp-register-image").val()
    };

    await this.patentContract.methods.registerPatent(JSON.stringify(tokenURI)).send({from: this.accounts[0]}, async () => {
      $("#dapp-register-image").val("");
      $("#dapp-register-image").val("");
      await this.updateUI();
    });
  },
  main: async function() {
    // Initialize web3
    await this.init();
    await this.updateUI();
  }
};

window.dApp = dApp;
window.dApp.main();
