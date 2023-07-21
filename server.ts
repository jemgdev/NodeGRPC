import path from 'path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { ProtoGrpcType } from './proto/random';
import { RandomHandlers } from './proto/randomPackage/Random';
import { TodoResponse } from './proto/randomPackage/TodoResponse';
import { TodoRequest } from './proto/randomPackage/TodoRequest';

const PORT = 8082

const PROTO_FILE = './proto/random.proto'
const packageOf = protoLoader.loadSync(path.resolve(__dirname, PROTO_FILE))

const grpcObject = (grpc.loadPackageDefinition(packageOf) as unknown) as ProtoGrpcType
const randomPackage = grpcObject.randomPackage

function main() {
  const server = getServer()

  server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error(error)
      return
    }
    console.log(`You server as started on port ${port}`)
    server.start()
  })
}

const todoList: {
  todos: TodoRequest[] 
} = { todos: [] }

function getServer() {
  const server = new grpc.Server()
  server.addService(randomPackage.Random.service, {
    PingPong: (request, response) => {
      console.log(request.request)
      response(null, {
        message: 'Pong'
      })
    },
    RandomNumbers: (call) => {
      const { maxValue } = call.request
      console.log(maxValue)

      let runCount = 0
      const id = setInterval(() => {
        runCount = ++runCount

        if (typeof maxValue === 'undefined') {
          call.write({ number: 0 })
          call.end()
          return
        }

        call.write({ number: Math.floor(Math.random() * maxValue) })

        if (runCount >= 10) {
          clearInterval(id)
          call.end()
        }
      }, 500)
    },
    TodoList: (call, callback) => {
      call.on('data', (chunk: TodoRequest) => {
        todoList.todos.push(chunk)
        console.log(chunk)
      })

      call.on('end', () => {
        callback(null, { toDos: todoList.todos })
      })
    }
  } as RandomHandlers)

  return server
}

main()