import { WarpFactory, LoggerFactory, Contract, Warp } from 'warp-contracts'
import { DeployPlugin } from 'warp-contracts-plugin-deploy'
import { ethers } from 'ethers'
import { gql } from '@apollo/client'
import ContractState, { ContractStateData } from './ContractState'
import BundlrClient from './BundlrClient'
import initialState from '../contracts/client-contract/data/initialState.json'

let seqNo = 1

interface InsertData {
    id?: string,
    contentType: string,
    size?: number,
    parentId: string,
    createdAt?: number,
    name: string
}

export default class UserContract {
    contractId: string
    contractSrcId: string
    instance: Contract<ContractStateData>
    state: ContractState
    warp: Warp
    provider: ethers.providers.Web3Provider
    client: BundlrClient
    updateUIAction: Function

    constructor() {
        this.state = new ContractState()
    }

    setContractSrcId(contractSrcId: string) {
        this.contractSrcId = contractSrcId
    }

    async updateState() {
        const stateData = (await this.instance.readState()).cachedValue.state
        this.state.setData(stateData)
    }

    async createContract() {
        this.warp.use(new DeployPlugin())

        const contractUpload = await this.client.upload('', {
            tags: [
                { name: 'Init-State', value: JSON.stringify({ ...initialState, owner: this.client.address }) },
                { name: 'App-Name', value: 'SmartWeaveContract' },
                { name: 'App-Version', value: process.env.NEXT_PUBLIC_WARP_SDK_VERSION ?? '' },
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Contract-Src', value: process.env.NEXT_PUBLIC_CONTRACT_SRC_ID ?? '' },
                { name: 'Client-App-Name', value: process.env.NEXT_PUBLIC_APP_NAME ?? '' }
            ]
        })

        const contractDeploy = await this.warp.register(contractUpload.id, 'node2')

        this.contractId = contractDeploy.contractTxId
        this.contractSrcId = process.env.NEXT_PUBLIC_CONTRACT_SRC_ID ?? ''
    }

    async initializeContract() {
        const contractId = localStorage.getItem(`${this.client.address}-${process.env.NEXT_PUBLIC_APP_NAME}-ContractId`)
        const contractSrcId = localStorage.getItem(`${this.client.address}-${process.env.NEXT_PUBLIC_APP_NAME}-ContractSrcId`)

        if (contractId) {
            this.contractId = contractId
            this.contractSrcId = contractSrcId ?? ''
        }

        else {
            const res = await this.client.query({
                query: gql`
                    query($owners: [String!]!, $clientAppName: String!) {
                        transactions(
                            owners: $owners,
                            tags:[
                                { name: "App-Name", values: "SmartWeaveContract" }
                                { name: "Client-App-Name", values: [$clientAppName] }
                            ]
                        ) {
                            edges {
                                node {
                                    id
                                    tags {
                                        name
                                        value
                                    }
                                }
                            }
                        }
                    }
                `,

                variables: {
                    owners: [this.client.owner],
                    clientAppName: process.env.NEXT_PUBLIC_APP_NAME
                }
            })
    
            const edges = res.data.transactions.edges

            if (edges.length == 0) {
                const fetchUrl = `${process.env.NEXT_PUBLIC_WARP_GATEWAY_URL}/contracts-by-source?id=${process.env.NEXT_PUBLIC_CONTRACT_SRC_ID}&limit=${process.env.NEXT_PUBLIC_WARP_GATEWAY_FETCH_LIMIT}&sort=desc`
                
                const contractId = await fetch(fetchUrl)
                    .then((res) => res.json())
                    .then((data) => data.contracts)
                    .then((contracts) => contracts.find(contract => contract.owner == this.client.address.toLowerCase())?.contractId)

                if (contractId) {
                    this.contractId = contractId
                    this.contractSrcId = process.env.NEXT_PUBLIC_CONTRACT_SRC_ID ?? ''
                }

                else {
                    await this.createContract()
                }
            }

            else {
                const node = edges[0].node
                this.contractId = node.id
                this.contractSrcId = node.tags.find(tag => tag.name == 'Contract-Src').value
            }

            localStorage.setItem(`${this.client.address}-${process.env.NEXT_PUBLIC_APP_NAME}-ContractId`, this.contractId)
            localStorage.setItem(`${this.client.address}-${process.env.NEXT_PUBLIC_APP_NAME}-ContractSrcId`, this.contractSrcId)
        }

    }

    async checkEvolve() {
        if (this.contractSrcId != process.env.NEXT_PUBLIC_CONTRACT_SRC_ID && this.state.getData().evolve != process.env.NEXT_PUBLIC_CONTRACT_SRC_ID) {
            await this.instance.evolve(process.env.NEXT_PUBLIC_CONTRACT_SRC_ID ?? '')
            await this.updateState()
        }
    }

    async initialize(provider: ethers.providers.Web3Provider, client: BundlrClient) {
        this.provider = provider
        this.client = client

        this.warp = WarpFactory.forMainnet()

        // LoggerFactory.INST.logLevel('none')
        
        await this.initializeContract()

        const { evmSignature } = await import('warp-contracts-plugin-signature')

        this.instance = this.warp.contract<ContractStateData>(this.contractId)
        this.instance.connect({ signer: evmSignature, type: 'ethereum' })

        await this.updateState()
        await this.checkEvolve()
    }

    localWrite(action: any) {
        const data = this.state.getData()
        const files = data.hierarchy.files

        switch (action.function) {
            case 'insert':
                const id = action.id ?? `temp_id_${++seqNo}`

                files[id] = {
                    id,
                    contentType: action.contentType,
                    size: action.size,
                    parentId: action.parentId,
                    name: action.name,
                    children: action.contentType == 'folder' ? [] : undefined,
                    createdAt: action.createdAt,
                    pending: true
                }

                if (action.parentId) {
                    files[action.parentId].children?.push(id)
                }
                
                break

            case 'rename':
                files[action.id].name = action.newName
                files[action.id].pending = true
                break 

            case 'relocate':
                const newParent = files[action.newParentId]
                const oldParent = files[action.oldParentId]

                const in_ids = {}
                action.ids.forEach(id => {
                    in_ids[id] = true
                    files[id].parentId = action.newParentId
                    files[id].pending = true
                })

                newParent.children?.push(...action.ids)
                oldParent.children = oldParent.children?.filter(id => !in_ids[id])
                break
        }
    }

    async updateUI() {
        if (this.updateUIAction) {
            this.updateUIAction()
        }
    }

    async writeInteraction(action: any) {
        this.localWrite(action)
        this.updateUIAction()
        await this.instance.writeInteraction(action)
        await this.updateState()
        this.updateUIAction()
    }

    async insert(data: InsertData) {
        await this.writeInteraction({ function: 'insert', ...data })
    }

    async rename(id: string, newName: string) {
        await this.writeInteraction({ function: 'rename', id, newName })
    }

    async relocate(ids: string[], oldParentId: string, newParentId: string) {
        await this.writeInteraction({ function: 'relocate', ids, oldParentId, newParentId })
    }

    async createInternalOwner() {
        const internalOwner = await this.warp.generateWallet()
        await this.writeInteraction({ function: 'setInternalOwner', value : internalOwner.address })
        console.log( this.state.data?.internalOwner)
        return internalOwner;
    }
}