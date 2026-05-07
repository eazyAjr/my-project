import crypto from 'crypto'
import * as XLSX from 'xlsx'

const FIELD_ALIASES = {
  ext_code: ['外部编码','外部单号','订单编号','单号','编号','order no','order number','external code','客户单号','外部订单号','外部编码号'],
  sender_name: ['发件人姓名','发件人','寄件人姓名','寄件人','发货人','sender','sender name','from name','寄方','发货人姓名','发件方'],
  sender_phone: ['发件人电话','发件人联系方式','寄件人电话','寄件人联系方式','sender phone','sender tel','from phone','寄方电话','发件人手机','寄件人手机','发件电话'],
  sender_address: ['发件人地址','发件人完整地址','寄件人地址','寄件人完整地址','sender address','from address','发货地址','寄方地址','发件地址','寄件地址'],
  receiver_name: ['收件人姓名','收件人','收货人姓名','收货人','收方','receiver','receiver name','to name','consignee','consignee name','收件方','收货方'],
  receiver_phone: ['收件人电话','收件人联系方式','收货人电话','收货人联系方式','receiver phone','receiver tel','to phone','收方电话','consignee phone','收件人手机','收货人手机','收件电话','收货电话'],
  receiver_address: ['收件人地址','收件人完整地址','收货人地址','收货人完整地址','receiver address','to address','收方地址','收货地址','consignee address','收件地址','收货地址','送达地址'],
  weight: ['重量','重量(kg)','重量（kg）','weight','货物重量','总重量','预估重量','kg','总重','包裹重量','净重','毛重'],
  quantity: ['件数','数量','包裹数量','包裹数','quantity','count','pieces','num','件','总件数','包裹件数','数量(件)','数量（件）'],
  temperature_layer: ['温层','温度','温度要求','temperature','temp','temp layer','温控','温度类型','temperature layer','temperature type','温度层','温度区间'],
  remark: ['备注','说明','附言','remark','notes','comment','description','备注信息','备注说明']
}

const REQUIRED_FIELDS = ['sender_name','sender_phone','sender_address','receiver_name','receiver_phone','receiver_address','weight','quantity','temperature_layer']
const TEMPERATURE_OPTIONS = ['常温','冷藏','冷冻']

function normalize(str) {
  return String(str).trim().toLowerCase().replace(/[（(）)\s]/g,'')
}

function calculateFingerprint(headers) {
  const sorted = headers.map(h=>normalize(h)).filter(h=>h.length>0).sort()
  return crypto.createHash('md5').update(sorted.join('|')).digest('hex')
}

function autoMatchHeaders(headers) {
  const mapping = {}
  const usedFields = new Set()
  headers.forEach((header,index)=>{
    const normHeader = normalize(header)
    if(!normHeader) return
    let bestField=null, bestScore=0
    for(const [field,aliases] of Object.entries(FIELD_ALIASES)){
      if(usedFields.has(field)) continue
      for(const alias of aliases){
        const normAlias = normalize(alias)
        let score=0
        if(normHeader===normAlias) score=100
        else if(normHeader.includes(normAlias)||normAlias.includes(normHeader)) score=80
        else if(normHeader.length>2&&normAlias.length>2){
          const common=[...new Set(normHeader.split(''))].filter(c=>normAlias.includes(c)).length
          score=(common/Math.max(normHeader.length,normAlias.length))*60
        }
        if(score>bestScore){bestScore=score;bestField=field}
      }
    }
    if(bestField&&bestScore>=50){
      mapping[bestField]={header,index}
      usedFields.add(bestField)
    }
  })
  return mapping
}

function validateOrderItem(item,index){
  const errors=[]
  for(const field of REQUIRED_FIELDS){
    const val=item[field]
    if(val===undefined||val===null||String(val).trim()===''){
      errors.push({row:index+1,field,message:`${FIELD_ALIASES[field][0]}为必填项`})
    }
  }
  const phoneRegex=/^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/
  if(item.sender_phone&&!phoneRegex.test(String(item.sender_phone).trim())){
    errors.push({row:index+1,field:'sender_phone',message:'发件人电话格式错误'})
  }
  if(item.receiver_phone&&!phoneRegex.test(String(item.receiver_phone).trim())){
    errors.push({row:index+1,field:'receiver_phone',message:'收件人电话格式错误'})
  }
  if(item.weight!==undefined&&item.weight!==''){
    const w=Number(item.weight)
    if(isNaN(w)||w<=0) errors.push({row:index+1,field:'weight',message:'重量必须为正数'})
  }
  if(item.quantity!==undefined&&item.quantity!==''){
    const q=Number(item.quantity)
    if(!Number.isInteger(q)||q<=0) errors.push({row:index+1,field:'quantity',message:'件数必须为正整数'})
  }
  if(item.temperature_layer&&!TEMPERATURE_OPTIONS.includes(String(item.temperature_layer).trim())){
    errors.push({row:index+1,field:'temperature_layer',message:'温层必须为：常温、冷藏、冷冻之一'})
  }
  return errors
}

export function setupOrderRoutes(app,sql,authMiddleware){
  // 分析模板
  app.post('/api/templates/analyze',authMiddleware,async(req,res)=>{
    const {headers}=req.body
    if(!Array.isArray(headers)||headers.length===0){
      return res.status(400).json({success:false,message:'表头不能为空'})
    }
    try{
      const fingerprint=calculateFingerprint(headers)
      const autoMapping=autoMatchHeaders(headers)
      const history=await sql`SELECT mapping FROM template_mappings WHERE header_fingerprint=${fingerprint}`
      res.json({success:true,fingerprint,headers,autoMapping,historyMapping:history.length>0?history[0].mapping:null})
    }catch(err){
      console.error('Analyze template error:',err)
      res.status(500).json({success:false,message:err.message||'服务器内部错误'})
    }
  })

  // 保存模板映射
  app.post('/api/templates',authMiddleware,async(req,res)=>{
    const {fingerprint,headers,mapping}=req.body
    if(!fingerprint||!mapping) return res.status(400).json({success:false,message:'缺少必要参数'})
    try{
      await sql`
        INSERT INTO template_mappings (header_fingerprint,headers,mapping)
        VALUES (${fingerprint},${JSON.stringify(headers||[])}::jsonb,${JSON.stringify(mapping)}::jsonb)
        ON CONFLICT (header_fingerprint) DO UPDATE SET
          headers=EXCLUDED.headers,
          mapping=EXCLUDED.mapping,
          updated_at=CURRENT_TIMESTAMP
      `
      res.json({success:true,message:'模板映射已保存'})
    }catch(err){
      console.error('Save template error:',err)
      res.status(500).json({success:false,message:err.message||'服务器内部错误'})
    }
  })

  // 校验订单数据
  app.post('/api/orders/validate',authMiddleware,async(req,res)=>{
    const {list}=req.body
    if(!Array.isArray(list)) return res.status(400).json({success:false,message:'数据格式错误'})
    try{
      const extCodes=list.filter(i=>i.ext_code).map(i=>String(i.ext_code).trim())
      const dbExtCodes=new Set()
      for(const code of extCodes){
        const existing=await sql`SELECT ext_code FROM orders WHERE ext_code=${code}`
        if(existing.length>0) dbExtCodes.add(code)
      }
      const allErrors=[]
      const batchExtCodes=new Set()
      list.forEach((item,index)=>{
        const errs=validateOrderItem(item,index)
        if(item.ext_code){
          const code=String(item.ext_code).trim()
          if(batchExtCodes.has(code)) errs.push({row:index+1,field:'ext_code',message:`外部编码"${code}"在同批次中重复`})
          batchExtCodes.add(code)
          if(dbExtCodes.has(code)) errs.push({row:index+1,field:'ext_code',message:`外部编码"${code}"已存在于数据库中`})
        }
        allErrors.push(...errs)
      })
      res.json({success:true,errors:allErrors,valid:allErrors.length===0})
    }catch(err){
      console.error('Validate orders error:',err)
      res.status(500).json({success:false,message:err.message||'服务器内部错误'})
    }
  })

  // 批量提交订单
  app.post('/api/orders/batch',authMiddleware,async(req,res)=>{
    const {list}=req.body
    if(!Array.isArray(list)||list.length===0) return res.status(400).json({success:false,message:'提交数据不能为空'})
    try{
      const extCodes=list.filter(i=>i.ext_code).map(i=>String(i.ext_code).trim())
      const dbExtCodes=new Set()
      for(const code of extCodes){
        const existing=await sql`SELECT ext_code FROM orders WHERE ext_code=${code}`
        if(existing.length>0) dbExtCodes.add(code)
      }
      const allErrors=[]
      const batchExtCodes=new Set()
      list.forEach((item,index)=>{
        const errs=validateOrderItem(item,index)
        if(item.ext_code){
          const code=String(item.ext_code).trim()
          if(batchExtCodes.has(code)) errs.push({row:index+1,field:'ext_code',message:`外部编码"${code}"在同批次中重复`})
          batchExtCodes.add(code)
          if(dbExtCodes.has(code)) errs.push({row:index+1,field:'ext_code',message:`外部编码"${code}"已存在于数据库中`})
        }
        allErrors.push(...errs)
      })
      if(allErrors.length>0){
        return res.status(400).json({success:false,message:'数据存在错误，请修正后再提交',errors:allErrors})
      }
      const batchId=crypto.randomUUID()
      let successCount=0,failCount=0
      for(const item of list){
        try{
          await sql`
            INSERT INTO orders (ext_code,sender_name,sender_phone,sender_address,receiver_name,receiver_phone,receiver_address,weight,quantity,temperature_layer,remark,submit_batch_id)
            VALUES (${item.ext_code||null},${item.sender_name},${item.sender_phone},${item.sender_address},${item.receiver_name},${item.receiver_phone},${item.receiver_address},${Number(item.weight)||0},${Number(item.quantity)||1},${item.temperature_layer},${item.remark||''},${batchId})
          `
          successCount++
        }catch(e){
          console.error('Insert order error:',e)
          failCount++
        }
      }
      res.json({success:true,message:`提交完成：成功 ${successCount} 条，失败 ${failCount} 条`,batchId,successCount,failCount})
    }catch(err){
      console.error('Batch submit error:',err)
      res.status(500).json({success:false,message:err.message||'服务器内部错误'})
    }
  })

  // 订单列表
  app.get('/api/orders',authMiddleware,async(req,res)=>{
    const {ext_code,receiver_name,start_time,end_time,page=1,size=10}=req.query
    try{
      const conditions=[]
      if(ext_code) conditions.push(sql`ext_code ILIKE ${'%'+ext_code+'%'}`)
      if(receiver_name) conditions.push(sql`receiver_name ILIKE ${'%'+receiver_name+'%'}`)
      if(start_time) conditions.push(sql`created_at >= ${start_time}::timestamp`)
      if(end_time) conditions.push(sql`created_at <= ${end_time}::timestamp`)
      let ordersQuery,countQuery
      if(conditions.length>0){
        const where=sql.join(conditions,sql` AND `)
        ordersQuery=sql`SELECT * FROM orders WHERE ${where} ORDER BY id DESC LIMIT ${Number(size)} OFFSET ${(Number(page)-1)*Number(size)}`
        countQuery=sql`SELECT COUNT(*) as total FROM orders WHERE ${where}`
      }else{
        ordersQuery=sql`SELECT * FROM orders ORDER BY id DESC LIMIT ${Number(size)} OFFSET ${(Number(page)-1)*Number(size)}`
        countQuery=sql`SELECT COUNT(*) as total FROM orders`
      }
      const orders=await ordersQuery
      const countResult=await countQuery
      const total=Number(countResult[0].total)
      res.json({
        success:true,
        data:orders.map(o=>({
          id:o.id,extCode:o.ext_code,senderName:o.sender_name,senderPhone:o.sender_phone,
          senderAddress:o.sender_address,receiverName:o.receiver_name,receiverPhone:o.receiver_phone,
          receiverAddress:o.receiver_address,weight:Number(o.weight),quantity:o.quantity,
          temperatureLayer:o.temperature_layer,remark:o.remark,status:o.status,createdAt:o.created_at
        })),
        total,page:Number(page),size:Number(size)
      })
    }catch(err){
      console.error('Orders list error:',err)
      res.status(500).json({success:false,message:err.message||'服务器内部错误'})
    }
  })

  // 删除订单
  app.delete('/api/orders/:id',authMiddleware,async(req,res)=>{
    const id=Number(req.params.id)
    try{
      const result=await sql`DELETE FROM orders WHERE id=${id} RETURNING id`
      if(result.length===0) return res.status(404).json({success:false,message:'运单不存在'})
      res.json({success:true,message:'删除成功'})
    }catch(err){
      console.error('Delete order error:',err)
      res.status(500).json({success:false,message:err.message||'服务器内部错误'})
    }
  })

  // 导出订单
  app.get('/api/orders/export',authMiddleware,async(req,res)=>{
    const {ext_code,receiver_name,start_time,end_time}=req.query
    try{
      const conditions=[]
      if(ext_code) conditions.push(sql`ext_code ILIKE ${'%'+ext_code+'%'}`)
      if(receiver_name) conditions.push(sql`receiver_name ILIKE ${'%'+receiver_name+'%'}`)
      if(start_time) conditions.push(sql`created_at >= ${start_time}::timestamp`)
      if(end_time) conditions.push(sql`created_at <= ${end_time}::timestamp`)
      let ordersQuery
      if(conditions.length>0){
        const where=sql.join(conditions,sql` AND `)
        ordersQuery=sql`SELECT * FROM orders WHERE ${where} ORDER BY id`
      }else{
        ordersQuery=sql`SELECT * FROM orders ORDER BY id`
      }
      const orders=await ordersQuery
      const rows=orders.map(o=>({
        '外部编码':o.ext_code||'','发件人姓名':o.sender_name,'发件人电话':o.sender_phone,
        '发件人地址':o.sender_address,'收件人姓名':o.receiver_name,'收件人电话':o.receiver_phone,
        '收件人地址':o.receiver_address,'重量(kg)':Number(o.weight),'件数':o.quantity,
        '温层':o.temperature_layer,'备注':o.remark||'','状态':o.status,
        '提交时间':o.created_at?new Date(o.created_at).toLocaleString('zh-CN'):''
      }))
      const ws=XLSX.utils.json_to_sheet(rows)
      ws['!cols']=[{wch:18},{wch:12},{wch:15},{wch:35},{wch:12},{wch:15},{wch:35},{wch:10},{wch:8},{wch:8},{wch:20},{wch:10},{wch:18}]
      const wb=XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb,ws,'运单列表')
      const buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'})
      res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition',`attachment; filename="orders.xlsx"; filename*=UTF-8''${encodeURIComponent('运单列表.xlsx')}`)
      res.send(buf)
    }catch(err){
      console.error('Export orders error:',err)
      res.status(500).json({success:false,message:err.message||'服务器内部错误'})
    }
  })
}
