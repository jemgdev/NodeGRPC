import path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './proto/random'

const PORT = 8082

const PROTO_FILE = './proto/random.proto'
const packageOf = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))

const grpcObject = (grpc.loadPackageDefinition(packageOf) as unknown) as ProtoGrpcType

const client = new grpcObject.randomPackage.Random(
  `0.0.0.0:${PORT}`, grpc.credentials.createInsecure()
)

const deadLine = new Date()
deadLine.setSeconds(deadLine.getSeconds() + 5)

client.waitForReady(deadLine, (error) => {
  if (error) {
    console.error(error)
    return
  }

  onClientReady()
})

function onClientReady() {
  // client.PingPong({
  //   message: 'Ping'
  // }, (error, result) => {
  //   if (error) {
  //     console.error(error)
  //     return
  //   }
  //   console.log(result)
  // })

  // const stream = client.RandomNumbers({
  //   maxValue: 85
  // })

  // stream.on('data', (chunk) => {
  //   console.log(chunk)
  // })

  // stream.on('end', () => {
  //   console.log('Communication ended')
  // })

  const stream = client.todoList((error, result) => {
    if (error) {
      console.error(error)
      return
    }

    console.log(result)
  })

  stream.write({ toDo: 'Work', status: 'Pending'})
  stream.write({ toDo: 'Work 1', status: 'Never'})
  stream.write({ toDo: 'Work 2', status: 'Always'})
  stream.write({ toDo: 'Work 3', status: 'Impossible'})
  stream.end()
}