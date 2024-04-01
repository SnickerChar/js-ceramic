import { IKVStore, IKVStoreFindResult, StoreSearchParams } from './ikv-store.js'
import { DiagnosticsLogger } from '@ceramicnetwork/common'
import { Level } from 'level'
import all from 'it-all'
import map from 'it-map'

class NotFoundError extends Error {
  readonly notFound = true
}

export class LevelKVStore implements IKVStore {
  constructor(readonly level: Level, readonly logger: DiagnosticsLogger) {}

  async init(): Promise<void> {
    // do nothing
    return
  }

  async close(): Promise<void> {
    await this.level.close()
  }

  async del(key: string): Promise<void> {
    try {
      return await this.level.del(key)
    } catch (err) {
      const msg = `Error deleting key ${key} from leveldb state store: ${err}`
      this.logger.warn(msg)
      throw new Error(msg)
    }
  }

  async get(key: string): Promise<any> {
    try {
      return await this.level.get(key)
    } catch (err) {
      const msg = `Error fetching key ${key} from leveldb state store: ${err}`
      if (err.notFound) {
        // Key not found errors are common and expected, it's too verbose to log them every time.
        throw new NotFoundError(msg)
      } else {
        this.logger.warn(msg)
        throw new Error(msg)
      }
    }
  }

  async isEmpty(params?: Partial<StoreSearchParams>): Promise<boolean> {
    const keys = await this.findKeys(params)
    return keys.length === 0
  }

  async exists(key: string): Promise<boolean> {
    try {
      const val = await this.get(key)
      return typeof val === 'string'
    } catch (e: any) {
      if (e.notFound) {
        return false
      } else {
        throw e
      }
    }
  }

  async find(params?: Partial<StoreSearchParams>): Promise<Array<IKVStoreFindResult>> {
    const searchParams: Record<string, any> = {
      keys: true,
      values: true,
      limit: params?.limit,
    }
    if (params?.gt) searchParams.gt = params.gt
    return all(
      map(this.level.iterator(searchParams), (r) => {
        return {
          key: r[0],
          value: r[1],
        }
      })
    )
  }

  async findKeys(params?: Partial<StoreSearchParams>): Promise<Array<string>> {
    const searchParams: Record<string, any> = {
      keys: true,
      values: false,
      limit: params?.limit,
    }

    return all(
      map(this.level.iterator(searchParams), (r) => {
        return r[0]
      })
    )
  }

  async put(key: string, value: any): Promise<void> {
    try {
      await this.level.put(key, value)
    } catch (err) {
      const msg = `Error storing key ${key} to leveldb state store: ${err}`
      this.logger.warn(msg)
      throw new Error(msg)
    }
  }
}